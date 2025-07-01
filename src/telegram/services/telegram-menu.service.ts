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
            text: "🏥  Farmacias Cercanas \n",
            callback_data: "solicitar_ubicacion_farmacia",
          },
        ],
        [
          {
            text: "👨‍🔬  Centros de Atención Médica Cercanos \n ",
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
            text: "🩺 Preguntar Acerca de Medicamentos",
            callback_data: "consulta_medica",
          },
        ],
        [
          {
            text: "⏰ Recordatorios de Medicamentos",
            callback_data: "recordatorios",
          },
        ],
        [
          {
            text: "📲 Recordatorio\nde Cita(s) ",
            callback_data: "recordatorio_cita_medica",
          },
        ],
        [
          {
            text: "📊 Interpretar Resultados de Laboratorio",
            callback_data: "interpretar_resultados",
          },
        ],
        [
          {
            text: "🗣️ Historial Médico",
            callback_data: "historial_medico",
          },
        ],
        [
          {
            text: "🚑 Crear ó Descargar Qr Emergencia",
            callback_data: "menu_emergencia", // Usar el callback_data que abre el menú de emergencia
          },
        ],
        [
          {
            text: "📞 Contacto con Desarrollador",
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
        `Bienvenido a tu Asistente Médico Virtual 🏥\n\n\n` +
        `Te puedo ayudar con:\n\n` +
        `• 💊 Encontrar farmacias cercanas a tu ubicación\n\n` +
        `• 🏥 Localizar centros médicos próximos a ti\n\n` +
        `🤖 *Consultas con IA:*\n` +
        `   Pregunta sobre medicamentos o interpreta resultados de laboratorio.\n\n` +
        `• ⏰ Recordatorios de tratamientos médicos*\n` +
        ` No olvides nunca más una dosis\n\n ` +
        `• 📊 Exportar tus recordatorios de medicamentos en PDF o CSV\n\n` +
        `• 📅 Agendar y administrar tus citas médicas\n\n` +
        `• 📋 Crear y mantener tu historial médico personal\n\n` +
        `• 📱 Compartir información médica con tus profesionales de salud\n\n` +
        `• 🔔 Recibir alertas personalizadas sobre tus medicamentos\n\n` +
        `• 🚑 *Tarjeta de Emergencia con QR:*\n` +
        `   *¡IMPORTANTE!* Crea un código QR con tu información médica vital. En una emergencia, los paramédicos pueden escanearlo para ayudarte mejor.\n\n` +
        `• 📞 Contactar al desarrollador para soporte o sugerencias\n\n` +
        `\n` +
        `¿En qué puedo ayudarte hoy?\n\n\n` +
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
