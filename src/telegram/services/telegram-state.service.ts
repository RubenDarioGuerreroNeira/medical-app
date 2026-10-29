import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Servicio de estado de conversación para el bot de Telegram.
 *
 * Almacena el estado FSM (Finite State Machine) por chatId en Redis,
 * permitiendo que el estado sobreviva reinicios y funcione en entorno
 * multi-instancia. Si Redis no está disponible, hace fallback a un Map
 * en memoria para no bloquear el bot en desarrollo.
 */
@Injectable()
export class TelegramStateService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramStateService.name);
  private redis: Redis | null = null;
  private readonly fallback = new Map<number, any>();
  private readonly prefix = 'telegram:state:';
  private isRedisAvailable = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const useRedis = this.configService.get<string>('USE_REDIS');
    const shouldUseRedis =
      useRedis !== 'false' && useRedis !== undefined && useRedis !== '';

    if (!shouldUseRedis) {
      this.logger.log(
        'Redis deshabilitado (USE_REDIS=false). Usando estado en memoria.',
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
        this.logger.log(
          'Conectado a Redis para estado de conversación de Telegram',
        );
      });

      this.redis.on('error', (err) => {
        this.logger.error('Error de Redis en estado de Telegram:', err.message);
        this.isRedisAvailable = false;
      });

      await this.redis.connect();
    } catch (error) {
      this.logger.error(
        'No se pudo inicializar Redis para estado. Usando fallback en memoria.',
        error,
      );
      this.redis = null;
      this.isRedisAvailable = false;
    }
  }

  /**
   * Obtiene el estado de un chat. Retorna undefined si no existe.
   */
  async get(chatId: number): Promise<any> {
    const key = this.prefix + chatId;
    if (this.isRedisAvailable && this.redis) {
      try {
        const val = await this.redis.get(key);
        return val ? JSON.parse(val) : undefined;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    return this.fallback.get(chatId);
  }

  /**
   * Guarda el estado de un chat.
   */
  async set(chatId: number, state: any): Promise<void> {
    const key = this.prefix + chatId;
    const val = JSON.stringify(state);
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.set(key, val);
        return;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    this.fallback.set(chatId, state);
  }

  /**
   * Elimina el estado de un chat.
   */
  async delete(chatId: number): Promise<void> {
    const key = this.prefix + chatId;
    if (this.isRedisAvailable && this.redis) {
      try {
        await this.redis.del(key);
        return;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    this.fallback.delete(chatId);
  }

  /**
   * Verifica si existe estado para un chat.
   */
  async has(chatId: number): Promise<boolean> {
    const key = this.prefix + chatId;
    if (this.isRedisAvailable && this.redis) {
      try {
        const exists = await this.redis.exists(key);
        return exists === 1;
      } catch (e) {
        this.isRedisAvailable = false;
      }
    }
    return this.fallback.has(chatId);
  }

  onModuleDestroy(): void {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
