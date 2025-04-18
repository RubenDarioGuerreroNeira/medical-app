import { Injectable } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import { TelegramKeyboard } from "../intrfaces/telegram.interfaces";

@Injectable()
export class TelegramMenuService extends TelegramBaseService {
  private getMainMenuKeyboard(): TelegramKeyboard {
    return {
      inline_keyboard: [
        [
          {
            text: "🏥  Farmacias Cercanas \nBuscar",
            callback_data: "solicitar_ubicacion_farmacia",
          },
        ],
        [
          {
            text: "👨‍🔬  Centros de Atención Médica Cercanos \nBuscar ",
            callback_data: "mostrarCentrosCercanos",
          },
        ],
        // [
        //   {
        //     text: "👨‍🔬  Centros de Atención Médica Colombia \nBuscar ",
        //     callback_data: "Centros médicos Colombia",
        //   },
        // ],
        [
          {
            text: "🩺 Preguntale a Nuestra IA ",
            callback_data: "consulta_medica",
          },
        ],
        [
          {
            text: "🙋‍♂️ Programar Recordatorio de Medicamentos",
            callback_data: "recordatorios",
          },
        ],
        [
          {
            text: "  Recordatorio de Citas Médicas",
            callback_data: "recordatorio_cita_medica",
          },
        ],
        [
          {
            text: "📞 Contacto con el Desarrollador",
            callback_data: "contacto",
          },
        ],
      ],
    };
  }

  async mostrarMenuPrincipal(chatId: number): Promise<void> {
    try {
      const chat = await this.bot.getChat(chatId);
      const userName = chat.first_name || "Usuario";

      const welcomeMessage =
        `¡Hola ${userName}! 👋\n\n` +
        `Bienvenido a tu Asistente Médico Virtual 🏥\n\n` +
        `Te puedo ayudar con:\n` +
        `• Encontrar farmacias cercanas 💊\n` +
        `• Localizar centros médicos próximos 🏥\n` +
        `• Responder consultas médicas con IA 🤖\n` +
        `• Programar recordatorios de medicamentos ⏰\n\n` +
        `• Gestionar tus citas médicas 📅\n\n` +
        `¿En qué puedo ayudarte hoy?\n\n` +
        `Selecciona una opción del menú:`;

      await this.bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: this.getMainMenuKeyboard(),
      });
    } catch (error) {
      this.logger.error("Error al mostrar menú principal:", error);
      const fallbackMessage =
        "¡Bienvenido! 👋\n\n" +
        "Soy tu Asistente Médico Virtual 🏥\n" +
        "¿En qué puedo ayudarte hoy?\n\n" +
        "Selecciona una opción del menú:";

      await this.bot.sendMessage(chatId, fallbackMessage, {
        reply_markup: this.getMainMenuKeyboard(),
      });
    }
  }

  async mostrarAyuda(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📋 Comandos disponibles:\n\n" +
        "/start - Iniciar el bot\n" +
        "/help - Ver esta lista de comandos\n\n" +
        "También puedes usar los botones del menú principal:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }
}
