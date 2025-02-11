import { Injectable, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { HttpException } from "@nestjs/common";

@Injectable()
export class TelegramErrorHandler {
  private readonly logger = new Logger(TelegramErrorHandler.name);

  async handleServiceError(
    bot: TelegramBot,
    error: any,
    methodName: string,
    chatId?: number
  ): Promise<void> {
    // Log del error
    this.logger.error(`Error en ${methodName}:`, error);

    // Si tenemos un chatId, intentamos enviar un mensaje al usuario
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

  private getErrorMessage(error: any): string {
    if (error instanceof HttpException) {
      return `Lo siento, ocurrió un error: ${error.message}`;
    }

    if (error instanceof Error) {
      if (
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("ECONNREFUSED")
      ) {
        return "No se pudo conectar con el servicio. Por favor, intenta nuevamente más tarde.";
      }
      return `Lo siento, ocurrió un error: ${error.message}`;
    }

    return "Lo siento, ocurrió un error inesperado. Por favor, intenta nuevamente.";
  }
}
