import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: TelegramBot;
  private readonly isDevelopment: boolean;
  private readonly webhookUrl: string;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 5000;

  constructor(private configService: ConfigService) {
    this.isDevelopment = configService.get("NODE_ENV") === "development";
    this.webhookUrl = configService.get("TELEGRAM_WEBHOOK_URL");
  }

  async onModuleInit() {
    await this.initializeBot();
  }

  async onModuleDestroy() {
    if (this.bot) {
      try {
        // Asegurarse de limpiar webhooks y detener polling antes de destruir
        await this.bot.stopPolling();
        await this.bot.deleteWebHook();
      } catch (error) {
        this.logger.error("Error during cleanup:", error);
      }
    }
  }

  private async initializeBot() {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    if (!token) {
      throw new Error("TELEGRAM_BOT_TOKEN no está configurado");
    }

    try {
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

  private async initializePollingBot(token: string) {
    try {
      // Primero, intentamos eliminar cualquier webhook existente
      const tempBot = new TelegramBot(token, { polling: false });
      await tempBot.deleteWebHook();

      // Luego iniciamos el bot con polling
      this.bot = new TelegramBot(token, {
        polling: {
          params: {
            timeout: 30,
          },
          interval: 2000,
          autoStart: true,
        },
      });

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

  private async handlePollingError(error: Error): Promise<void> {
    this.logger.error(`Error de polling: ${error.message}`);

    // Si es un error 409, intentamos reiniciar el polling
    if (error.message.includes("409")) {
      await this.handleConflictError();
      return;
    }

    if (this.retryCount >= this.MAX_RETRIES) {
      this.logger.error("Máximo número de reintentos alcanzado");
      this.retryCount = 0;
      return;
    }

    try {
      await this.bot.stopPolling();
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

  private async handleConflictError(): Promise<void> {
    try {
      await this.bot.stopPolling();
      await this.bot.deleteWebHook();
      await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));
      await this.bot.startPolling();

      this.logger.log("Bot reiniciado exitosamente después de error 409");
    } catch (error) {
      this.logger.error("Error al manejar conflicto 409:", error);
    }
  }

  // Método público para enviar mensajes
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
