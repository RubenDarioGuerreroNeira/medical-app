import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import Redis from "ioredis";
import * as https from "https";

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: TelegramBot;
  private readonly isDevelopment: boolean;
  private readonly webhookUrl: string;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 5000;
  private redis: Redis | null = null; // Instancia de Redis
  private readonly lockKey = "telegram_bot_service_lock";
  private isLockHolder = false;
  private lockInterval: NodeJS.Timeout;

  constructor(private configService: ConfigService) {
    this.isDevelopment = configService.get("NODE_ENV") === "development";
    this.webhookUrl = configService.get("TELEGRAM_WEBHOOK_URL");

    // inicializo como null por defecto
    this.redis = null;

    // Cambiar la lógica para que sea más explícita
    const useRedis = this.configService.get<string>("USE_REDIS");
    const shouldUseRedis =
      useRedis !== "false" && useRedis !== undefined && useRedis !== "";

    if (shouldUseRedis) {
      try {
        // Mejorada la configuración de Redis
        this.redis = new Redis({
          host: this.configService.get<string>("REDIS_HOST") || "localhost",
          port: this.configService.get<number>("REDIS_PORT") || 6379,
          retryStrategy: (times) => {
            // Si estamos en desarrollo y Redis falla, deshabilitarlo después de algunos intentos
            if (this.isDevelopment && times > 2) {
              this.logger.warn(
                "Redis connection failed multiple times in development. Disabling Redis."
              );
              return null; // Esto detiene los reintentos
            }
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: this.isDevelopment ? 1 : 3,
          enableReadyCheck: true,
          reconnectOnError: (err) => {
            const targetError = "READONLY";
            if (err.message.includes(targetError)) {
              return true;
            }
            return false;
          },
        });

        // Manejadores de eventos de Redis
        this.redis.on("error", (error) => {
          this.logger.error("Redis connection error:", error);
          // En desarrollo, si hay error de conexión, deshabilitamos Redis
          if (this.isDevelopment && error.message.includes("ECONNREFUSED")) {
            this.logger.warn(
              "Redis connection refused in development. Disabling Redis."
            );
            this.redis = null;
          }
        });

        this.redis.on("connect", () => {
          this.logger.log("Successfully connected to Redis");
        });

        // establezo un time out para la conexion inicial
        setTimeout(() => {
          if (!this.redis) {
            this.logger.warn("Redis connection timeout. Disabling Redis.");
          }
        }, 5000);
      } catch (error) {
        this.logger.error("Error initializing Redis:", error);
        if (this.isDevelopment) {
          this.logger.warn(
            "Disabling Redis in development due to initialization error"
          );
          this.redis = null;
        }
      }
    } else {
      this.logger.log("Redis explicitly disabled by configuration");
      this.redis = null;
    }
  }

  async onModuleInit() {
    try {
      let canInitializeBot = true;

      // Verificar si ya hay otra instancia del bot ejecutándose
      // Si TelegramService ya inició una instancia, no iniciaremos otra
      try {
        const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
        const tempBot = new TelegramBot(token, { polling: false });
        const updates = await tempBot.getUpdates({ limit: 1, timeout: 0 });

        // Si hay actualizaciones pendientes, probablemente ya hay un bot activo
        if (updates && updates.length > 0) {
          this.logger.log(
            "Se detectó otra instancia del bot activa. No se iniciará el polling en TelegramBotService."
          );
          canInitializeBot = false;
        }
      } catch (error) {
        // Si hay un error al verificar, continuamos con la inicialización normal
        this.logger.warn(
          "Error al verificar instancias existentes del bot:",
          error
        );
      }

      // Verificar conexión a Redis antes de continuar (si está habilitado)
      if (this.redis && canInitializeBot) {
        try {
          await this.redis.ping();

          const lockAcquired = await this.acquireLock(30000);
          if (!lockAcquired) {
            this.logger.warn("Otra instancia del bot ya está ejecutándose.");
            canInitializeBot = false;
          } else {
            this.isLockHolder = true;
            // Inicio el intervalo de renovacion del lock
            this.startLockRenewal();
          }
        } catch (error) {
          this.logger.error("Error connecting to Redis:", error);
          // En desarrollo, continuamos sin Redis
          if (this.isDevelopment) {
            this.logger.warn("Continuing without Redis in development mode");
          } else {
            throw error;
          }
        }
      } else if (!this.redis) {
        // Redis está deshabilitado, continuamos sin verificar lock
        this.logger.log("Initializing bot without Redis lock");
      }

      if (canInitializeBot) {
        await this.initializeBot();
      } else {
        // Crear una instancia del bot sin polling para poder usarla en otros servicios
        const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
        this.bot = new TelegramBot(token, { polling: false });
        this.logger.log("Bot inicializado sin polling (modo pasivo)");
      }
    } catch (error) {
      this.logger.error("Error during initialization:", error);
      if (this.redis && this.isLockHolder) {
        await this.releaseLock();
      }
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      if (this.lockInterval) {
        clearInterval(this.lockInterval);
      }

      if (this.isLockHolder) {
        await this.releaseLock();
      }

      if (this.bot) {
        await this.bot.stopPolling();
        await this.bot.deleteWebHook();
      }
    } catch (error) {
      this.logger.error("Error during cleanup:", error);
    }
  }

  private async acquireLock(ttl: number): Promise<boolean> {
    if (!this.redis) return true; // Si no hay Redis, siempre devolvemos true

    try {
      const result = await this.redis.set(
        this.lockKey,
        process.pid.toString(),
        "PX",
        ttl,
        "NX"
      );
      return result === "OK";
    } catch (error) {
      this.logger.error("Error acquiring lock:", error);
      return this.isDevelopment; // En desarrollo, permitimos continuar
    }
  }

  private async releaseLock(): Promise<void> {
    if (!this.redis) return; // Si no hay Redis, no hacemos nada

    try {
      // Solo liberar el lock si somos el propietario
      const lockValue = await this.redis.get(this.lockKey);
      if (lockValue === process.pid.toString()) {
        await this.redis.del(this.lockKey);
        this.isLockHolder = false;
      }
    } catch (error) {
      this.logger.error("Error releasing lock:", error);
    }
  }

  private startLockRenewal() {
    if (!this.redis) return; // Si no hay Redis, no hacemos nada

    // Renovar el lock cada 20 segundos
    this.lockInterval = setInterval(async () => {
      try {
        const lockValue = await this.redis.get(this.lockKey);
        if (lockValue === process.pid.toString()) {
          await this.redis.pexpire(this.lockKey, 30000); // Renovar por 30 segundos
        } else {
          // Perdimos el lock
          this.logger.warn("Lock perdido. Deteniendo el bot...");
          clearInterval(this.lockInterval);
          this.isLockHolder = false;
          if (this.bot) {
            await this.bot.stopPolling();
          }
        }
      } catch (error) {
        this.logger.error("Error renovando lock:", error);
      }
    }, 20000);
  }

  private async handleConflictError(): Promise<void> {
    try {
      if (!this.isLockHolder) {
        this.logger.warn(
          "No somos el holder del lock. Ignorando conflicto 409."
        );

        // Si no somos el holder del lock, desactivamos el polling para evitar más conflictos
        try {
          await this.bot.stopPolling();
          this.logger.log(
            "Polling detenido para evitar conflictos adicionales"
          );
        } catch (stopError) {
          this.logger.error("Error al detener polling:", stopError);
        }

        return;
      }

      this.logger.warn("Conflicto detectado (409). Reiniciando bot...");
      await this.bot.stopPolling();
      await this.bot.deleteWebHook();
      await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));

      // Verificar que aún tenemos el lock antes de reiniciar (solo si Redis está habilitado)
      if (this.redis) {
        const lockValue = await this.redis.get(this.lockKey);
        if (lockValue === process.pid.toString()) {
          await this.bot.startPolling();
          this.logger.log(
            "Bot reiniciado exitosamente después de conflicto 409"
          );
        } else {
          this.logger.warn("Lock perdido durante el reinicio. Abortando.");
          this.isLockHolder = false;
        }
      } else {
        // Si Redis está deshabilitado, simplemente reiniciamos
        await this.bot.startPolling();
        this.logger.log(
          "Bot reiniciado exitosamente después de conflicto 409 (sin Redis)"
        );
      }
    } catch (error) {
      this.logger.error("Error al manejar conflicto 409:", error);
    }
  }

  private async initializeBot() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
    }

    try {
      // Asegurarse de que no haya instancias previas
      const tempBot = new TelegramBot(token, { polling: false });
      await tempBot.deleteWebHook();

      if (this.isDevelopment) {
        await this.initializePollingBot(token);
      } else {
        await this.initializeWebhookBot(token);
      }
    } catch (error) {
      this.logger.error("Error initializing bot:", error);
      throw error;
    }
  }

  // private async initializePollingBot(token: string) {
  //   try {
  //     this.bot = new TelegramBot(token, {
  //       polling: {
  //         params: {
  //           timeout: 30,
  //         },
  //         interval: 2000,
  //         autoStart: true,
  //       },
  //     });

  //     // Mejorado el manejo de errores
  //     this.setupErrorHandlers();
  //     this.logger.log("Bot iniciado en modo polling (desarrollo)");
  //   } catch (error) {
  //     this.logger.error("Error al inicializar bot en modo polling:", error);
  //     throw error;
  //   }
  // }

  private async initializePollingBot(token: string) {
    try {
      this.bot = new TelegramBot(token, {
        polling: {
          params: {
            timeout: 30,
          },
          interval: 2000,
          autoStart: true,
        },
      });

      // Mejorado el manejo de errores
      this.setupErrorHandlers();
      this.logger.log("Bot iniciado en modo polling (desarrollo)");
    } catch (error) {
      this.logger.error("Error al inicializar bot en modo polling:", error);
      throw error;
    }
  }

  private async initializeWebhookBot(token: string) {
    try {
      // Crear bot sin polling
      this.bot = new TelegramBot(token, { webHook: { port: 3000 } });

      // Configurar webhook
      await this.bot.setWebHook(`${this.webhookUrl}/telegram-webhook`);

      this.logger.log(
        `Bot iniciado en modo webhook (producción) - ${this.webhookUrl}`
      );
    } catch (error) {
      this.logger.error("Error al inicializar bot en modo webhook:", error);
      throw error;
    }
  }

  private setupErrorHandlers() {
    this.bot.on("polling_error", async (error) => {
      await this.handlePollingError(error);
    });

    this.bot.on("error", async (error) => {
      await this.handlePollingError(error);
    });

    this.bot.on("webhook_error", (error) => {
      this.logger.error("Error de webhook:", error);
    });
  }

  // private async handlePollingError(error: Error): Promise<void> {
  //   this.logger.error(`Error de polling: ${error.message}`);

  //   // Si es un error 409, intentamos reiniciar el polling
  //   if (error.message.includes("409")) {
  //     await this.handleConflictError();
  //     return;
  //   }

  //   if (this.retryCount >= this.MAX_RETRIES) {
  //     this.logger.error("Máximo número de reintentos alcanzado");
  //     this.retryCount = 0;
  //     return;
  //   }

  //   try {
  //     await this.bot.stopPolling();
  //     await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
  //     await this.bot.startPolling();

  //     this.logger.log("Polling reiniciado exitosamente");
  //     this.retryCount = 0;
  //   } catch (retryError) {
  //     this.retryCount++;
  //     this.logger.error(
  //       `Error al reiniciar polling (intento ${this.retryCount}/${this.MAX_RETRIES}):`,
  //       retryError
  //     );
  //   }
  // }

  // // Método público para enviar mensajes
  // async sendMessage(
  //   chatId: number,
  //   text: string
  // ): Promise<TelegramBot.Message> {
  //   try {
  //     return await this.bot.sendMessage(chatId, text);
  //   } catch (error) {
  //     this.logger.error(`Error al enviar mensaje a ${chatId}:`, error);
  //     throw error;
  //   }
  // }

  private async handlePollingError(error: Error): Promise<void> {
    this.logger.error(`Error de polling: ${error.message}`);
  
    // Manejar errores fatales y de conexión restablecida
    if (
      error.message.includes("ECONNRESET") || 
      error.message.includes("EFATAL") ||
      (error as any).code === "EFATAL" ||
      (error as any).code === "ECONNRESET"
    ) {
      this.logger.warn(
        "Error de conexión detectado. Reiniciando polling con retraso exponencial..."
      );
      
      try {
        // Asegurarse de detener el polling actual
        if (this.bot.isPolling()) {
          await this.bot.stopPolling();
        }
        
        // Implementar backoff exponencial
        const delayTime = Math.min(
          5000 * Math.pow(2, this.retryCount), 
          60000
        ); // Entre 5s y 60s
        
        this.logger.log(`Esperando ${delayTime/1000} segundos antes de reintentar...`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        
        // Reiniciar el polling con configuración más robusta
        await this.bot.startPolling({
          polling: {
            params: {
              timeout: 30,
              allowed_updates: ["message", "callback_query", "inline_query"]
            },
            interval: 3000 // Intervalo más largo para reducir la carga
          }
        });
        
        this.logger.log("Polling reiniciado exitosamente después de error de conexión");
        this.retryCount = 0;
        return;
      } catch (retryError) {
        this.retryCount++;
        this.logger.error(
          `Error al reiniciar después de error de conexión (intento ${this.retryCount}/${this.MAX_RETRIES}):`,
          retryError
        );
        
        // Si alcanzamos el máximo de reintentos, esperamos un tiempo más largo
        if (this.retryCount >= this.MAX_RETRIES) {
          this.logger.warn(`Máximo número de reintentos alcanzado. Esperando 2 minutos antes de reiniciar contador.`);
          await new Promise((resolve) => setTimeout(resolve, 120000));
          this.retryCount = 0;
        }
      }
    }
  
    // Si es un error 409, intentamos reiniciar el polling
    if (error.message.includes("409")) {
      await this.handleConflictError();
      return;
    }
  
    // Manejo genérico para otros errores de polling
    if (this.retryCount >= this.MAX_RETRIES) {
      this.logger.error("Máximo número de reintentos alcanzado");
      this.retryCount = 0;
      return;
    }
  
    try {
      if (this.bot.isPolling()) {
        await this.bot.stopPolling();
      }
      await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
      await this.bot.startPolling();
  
      this.logger.log("Polling reiniciado exitosamente");
      this.retryCount = 0;
    } catch (retryError) {
      this.retryCount++;
      this.logger.error(
        `Error al reiniciar polling (intento ${this.retryCount}/${this.MAX_RETRIES}):`,
        retryError
      );
    }
  }

  // Añadir el método sendMessage que está siendo utilizado por TelegramWebhookController
  async sendMessage(
    chatId: number,
    text: string
  ): Promise<TelegramBot.Message> {
    try {
      return await this.bot.sendMessage(chatId, text);
    } catch (error) {
      this.logger.error(`Error al enviar mensaje a ${chatId}:`, error);
      throw error;
    }
  }
}
