import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface RateLimitData {
  count: number;
  windowStart: number;
}

/**
 * Servicio de rate limiting para el bot de Telegram.
 *
 * Limita la cantidad de requests por chatId dentro de una ventana de tiempo deslizante.
 * Usa Redis (con fallback en memoria) para persistir contadores, permitiendo que el
 * rate limiting sobreviva reinicios y funcione en entorno multi-instancia.
 */
@Injectable()
export class TelegramRateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramRateLimitService.name);
  private readonly prefix = 'telegram:ratelimit:';
  private redis: Redis | null = null;
  private readonly fallback = new Map<string, RateLimitData>();
  private isRedisAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const useRedis = this.configService.get<string>('USE_REDIS');
    const shouldUseRedis =
      useRedis !== 'false' && useRedis !== undefined && useRedis !== '';

    if (!shouldUseRedis) {
      this.logger.log(
        'Redis deshabilitado (USE_REDIS=false). Usando rate limit en memoria.',
      );
      return;
    }

    try {
      this.redis = new Redis({
        host: this.configService.get<string>('REDIS_HOST') || 'localhost',
        port: this.configService.get<number>('REDIS_PORT') || 6379,
        retryStrategy: (times) => Math.min(times * 50, 2000),
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.isRedisAvailable = true;
        this.logger.log('Conectado a Redis para rate limiting de Telegram');
      });

      this.redis.on('error', (err) => {
        this.logger.error('Error de Redis en rate limiting:', err.message);
        this.isRedisAvailable = false;
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error(
        'No se pudo inicializar Redis para rate limiting. Usando fallback en memoria.',
        error,
      );
      this.redis = null;
      this.isRedisAvailable = false;
    }
  }

  /**
   * Verifica si el chatId puede ejecutar una acción dentro del rate limit.
   *
   * @returns { allowed, remaining, resetTime }
   *   - allowed: true si la request está permitida, false si se excedió el límite.
   *   - remaining: cuántas requests quedan en la ventana actual.
   *   - resetTime: timestamp (ms) de cuándo se reinicia la ventana.
   */
  async checkLimit(chatId: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const maxRequests = this.configService.get<number>(
      'TELEGRAM_RATE_LIMIT_MAX_REQUESTS',
      30,
    );
    const windowMs = this.configService.get<number>(
      'TELEGRAM_RATE_LIMIT_WINDOW_MS',
      60000,
    ); // 1 minuto por defecto
    const now = Date.now();
    const key = this.prefix + chatId;

    const data = await this.getData(key);

    if (!data || now - data.windowStart > windowMs) {
      // Iniciar nueva ventana
      await this.setData(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs,
      };
    }

    if (data.count >= maxRequests) {
      // Límite excedido en la ventana actual
      return {
        allowed: false,
        remaining: 0,
        resetTime: data.windowStart + windowMs,
      };
    }

    // Incrementar contador dentro de la ventana actual
    data.count++;
    await this.setData(key, data);
    return {
      allowed: true,
      remaining: maxRequests - data.count,
      resetTime: data.windowStart + windowMs,
    };
  }

  /**
   * Resetea el rate limit de un chatId (útil para administradores o pruebas).
   */
  async resetLimit(chatId: number): Promise<void> {
    const key = this.prefix + chatId;
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    this.fallback.delete(key);
  }

  // --- Operaciones privadas de almacenamiento ---

  private async getData(key: string): Promise<RateLimitData | undefined> {
    if (this.isRedisAvailable && this.redis) {
      try {
        const val = await this.redis.get(key);
        return val ? JSON.parse(val) : undefined;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    return this.fallback.get(key);
  }

  private async setData(key: string, data: RateLimitData): Promise<void> {
    const val = JSON.stringify(data);
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.set(key, val);
        return;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    this.fallback.set(key, data);
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
