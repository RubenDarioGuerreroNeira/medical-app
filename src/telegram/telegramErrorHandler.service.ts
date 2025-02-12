import { Injectable, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { HttpException } from "@nestjs/common";

@Injectable()
export class TelegramErrorHandler {
  private readonly logger = new Logger(TelegramErrorHandler.name);
  private lastUpdateId = 0;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;

  async handleServiceError(
    bot: TelegramBot,
    error: any,
    methodName: string,
    chatId?: number
  ): Promise<void> {
    this.logger.error(`Error en ${methodName}:`, error);

    if (this.isPollingError(error)) {
      await this.handlePollingError(bot, error);
      return;
    }

    if (chatId) {
      try {
        await bot.sendMessage(chatId, this.getErrorMessage(error), {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          },
        });
      } catch (sendError) {
        this.logger.error("Error al enviar mensaje de error:", sendError);
      }
    }
  }

  private async handlePollingError(
    bot: TelegramBot,
    error: any
  ): Promise<void> {
    if (
      error.code === "ETELEGRAM" &&
      error.response?.body?.error_code === 409
    ) {
      this.logger.warn(
        "Conflicto de webhook detectado, reiniciando polling..."
      );
      await this.restartPolling(bot);
      return;
    }

    if (this.retryCount < this.MAX_RETRIES) {
      const delay = Math.pow(2, this.retryCount) * 1000;
      this.retryCount++;
      this.logger.warn(
        `Reintentando en ${delay}ms (intento ${this.retryCount}/${this.MAX_RETRIES})`
      );

      setTimeout(async () => {
        await this.restartPolling(bot);
      }, delay);
    } else {
      this.logger.error("Máximo número de reintentos alcanzado");
      this.retryCount = 0;
    }
  }

  private async restartPolling(bot: TelegramBot): Promise<void> {
    try {
      if (bot.isPolling()) {
        await bot.stopPolling();
      }

      const updates = await bot.getUpdates({ offset: -1, limit: 1 });
      if (updates.length > 0) {
        this.lastUpdateId = updates[0].update_id + 1;
      }

      await bot.startPolling({
        polling: {
          params: {
            timeout: 30,
            offset: this.lastUpdateId,
          },
        },
      });

      this.logger.log("Polling reiniciado exitosamente");
      this.retryCount = 0;
    } catch (error) {
      this.logger.error("Error al reiniciar polling:", error);
      await this.handlePollingError(bot, error);
    }
  }

  private getErrorMessage(error: any): string {
    if (error instanceof HttpException) {
      return `Lo siento, ocurrió un error: ${error.message}`;
    }

    if (error instanceof Error) {
      if (this.isConnectionError(error)) {
        return "No se pudo conectar con el servicio. Por favor, intenta nuevamente más tarde.";
      }
      if (this.isRateLimitError(error)) {
        return "Demasiadas solicitudes. Por favor, espera un momento antes de intentar nuevamente.";
      }
      return `Lo siento, ocurrió un error: ${error.message}`;
    }

    return "Lo siento, ocurrió un error inesperado. Por favor, intenta nuevamente.";
  }

  private isPollingError(error: any): boolean {
    return (
      error.code === "ETELEGRAM" ||
      error.code === "ETIMEDOUT" ||
      (error instanceof Error && error.message.includes("Polling"))
    );
  }

  private isConnectionError(error: Error): boolean {
    return (
      error.message.includes("ETIMEDOUT") ||
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("ECONNRESET")
    );
  }

  private isRateLimitError(error: Error): boolean {
    return (
      error.message.includes("429") ||
      error.message.includes("Too Many Requests")
    );
  }
}

// import { Injectable, Logger } from "@nestjs/common";
// import * as TelegramBot from "node-telegram-bot-api";
// import { HttpException } from "@nestjs/common";

// @Injectable()
// export class TelegramErrorHandler {
//   private readonly logger = new Logger(TelegramErrorHandler.name);

//   async handleServiceError(
//     bot: TelegramBot,
//     error: any,
//     methodName: string,
//     chatId?: number
//   ): Promise<void> {
//     // Log del error
//     this.logger.error(`Error en ${methodName}:`, error);

//     // Si tenemos un chatId, intentamos enviar un mensaje al usuario
//     if (chatId) {
//       try {
//         await bot.sendMessage(chatId, this.getErrorMessage(error), {
//           reply_markup: {
//             inline_keyboard: [
//               [
//                 {
//                   text: "🔙 Volver al menú principal",
//                   callback_data: "menu_principal",
//                 },
//               ],
//             ],
//           },
//         });
//       } catch (sendError) {
//         this.logger.error("Error al enviar mensaje de error:", sendError);
//       }
//     }
//   }

//   private getErrorMessage(error: any): string {
//     if (error instanceof HttpException) {
//       return `Lo siento, ocurrió un error: ${error.message}`;
//     }

//     if (error instanceof Error) {
//       if (
//         error.message.includes("ETIMEDOUT") ||
//         error.message.includes("ECONNREFUSED")
//       ) {
//         return "No se pudo conectar con el servicio. Por favor, intenta nuevamente más tarde.";
//       }
//       return `Lo siento, ocurrió un error: ${error.message}`;
//     }

//     return "Lo siento, ocurrió un error inesperado. Por favor, intenta nuevamente.";
//   }
// }
