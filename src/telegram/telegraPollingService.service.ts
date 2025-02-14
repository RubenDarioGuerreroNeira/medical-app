import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";

@Injectable()
export class TelegramPollingService {
  private readonly logger = new Logger(TelegramPollingService.name);
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAY = 5000;

  constructor(private configService: ConfigService) {}

  async initializeBot(token: string): Promise<TelegramBot> {
    try {
      const bot = new TelegramBot(token, {
        polling: {
          params: {
            timeout: 30,
          },
          interval: 2000,
          autoStart: true
        },
      });

      // Configurar manejador de errores
      bot.on("polling_error", async (error) => {
        await this.handlePollingError(error, bot);
      });

      bot.on("error", async (error) => {
        await this.handlePollingError(error, bot);
      });

      return bot;
    } catch (error) {
      this.logger.error("Error al inicializar el bot:", error);
      throw error;
    }
  }

  private async handlePollingError(
    error: Error,
    bot: TelegramBot
  ): Promise<void> {
    this.logger.error(`Error de polling: ${error.message}`);

    if (this.retryCount >= this.MAX_RETRIES) {
      this.logger.error("Máximo número de reintentos alcanzado");
      this.retryCount = 0;
      return;
    }

    try {
      // Detener el polling actual
      await bot.stopPolling();

      // Esperar antes de reintentar
      await new Promise((resolve) => setTimeout(resolve, this.RETRY_DELAY));

      // Reiniciar el polling
      await bot.startPolling();

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
}