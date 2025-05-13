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
            text: "🩺 Preguntas sobre medicamentos",
            callback_data: "consulta_medica",
          },
        ],
        [
          {
            text: "🙋‍♂️ Recordatorio\n\nde tratamiento(s) medicos",
            callback_data: "recordatorios",
          },
        ],
        [
          {
            text: "📲 Recordatorio\nde cita(s) médica(s)",
            callback_data: "recordatorio_cita_medica",
          },
        ],
        [
          {
            text: "📊 Interpretar resultados de laboratorio",
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
        `• 💊 Encontrar farmacias cercanas a tu ubicación\n` +
        `• 🏥 Localizar centros médicos próximos a ti\n` +
        `• 🤖 Consultar información sobre medicamentos con IA\n` +
        `  (puedes escribir o enviar una foto del medicamento)\n` +
        `• ⏰ Programar y gestionar recordatorios para tus tratamientos médicos\n` +
        `• 📊 Exportar tus recordatorios de medicamentos en PDF o CSV\n` +
        `• 📅 Agendar y administrar tus citas médicas\n` +
        `• 📋 Crear y mantener tu historial médico personal\n` +
        `• 📱 Compartir información médica con tus profesionales de salud\n` +
        `• 🔔 Recibir alertas personalizadas sobre tus medicamentos\n` +
        `• 🧪 Interpretar resultados de laboratorio (envía texto o foto y recibe una interpretación automática)\n\n` +
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
