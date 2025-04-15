import { Injectable, Inject } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import { TelegramMenuService } from "./telegram-menu.service";

@Injectable()
export class TelegramContactService extends TelegramBaseService {
  constructor(
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    private menuService: TelegramMenuService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

  async mostrarContacto(chatId: number): Promise<void> {
    try {
      const phoneNumber = "584160897020"; // Removido el "+" del inicio
      const user = "Rubedev";
      const email = "rudargeneira@gmail.com";
      const mensaje =
        "👨‍💻 *Desarrollador*\n\n" +
        "🧑‍💻 *Nombre:* Rubén Guerrero\n" +
        "📧 *Email:* rudargeneira@gmail.com\n" +
        // "📱 *Telegram:* +" +
        // phoneNumber;
        "📱 *Telegram:* " +
        user +
        "\n" +
        "📱 *WhatsApp:* +" +
        phoneNumber;

      await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💬 Mensaje por Telegram",
                // url: `https://t.me/${phoneNumber}`,
                url: `https://t.me/${user}`,
              },
            ],
            [
              {
                text: "✍️ Mensaje por WhatsApp",
                url: `https://wa.me/${phoneNumber.replace(/[+\s]/g, "")}`,
              },
            ],

            [
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error(
        "Error al mostrar información del desarrollador:",
        error
      );
      await this.bot.sendMessage(
        chatId,
        "Lo siento, hubo un error al mostrar la información del desarrollador. Por favor, intenta nuevamente.",
        {
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
        }
      );
    }
  }
}
