// telegram.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import {
  AppointmentNotification,
  TelegramKeyboard,
} from "./telegram.interfaces";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    this.bot = new TelegramBot(token, { polling: true });
    this.initializeBot();
  }

  private initializeBot(): void {
    // Comando /start con botones
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userName = msg.from.first_name;

      // Log del chatId para guardarlo
      this.logger.log(`Nuevo usuario: ${userName}, ChatID: ${chatId}`);

      await this.mostrarMenuPrincipal(chatId, userName);
    });

    // Manejador de callbacks para botones
    this.bot.on("callback_query", async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;

      switch (action) {
        case "ver_citas":
          await this.mostrarCitas(chatId);
          break;
        case "nueva_cita":
          await this.iniciarNuevaCita(chatId);
          break;
        case "cancelar_cita":
          await this.mostrarCitasParaCancelar(chatId);
          break;
        case "contacto":
          await this.mostrarContacto(chatId);
          break;
        case "menu_principal":
          await this.mostrarMenuPrincipal(chatId);
          break;
        default:
          if (action.startsWith("especialidad_")) {
            await this.seleccionarEspecialidad(
              chatId,
              action.replace("especialidad_", "")
            );
          } else if (action.startsWith("cancelar_")) {
            await this.confirmarCancelacion(
              chatId,
              action.replace("cancelar_", "")
            );
          }
      }

      // Responder al callback para quitar el "loading" del botón
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });

    // Comando /help
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.mostrarAyuda(chatId);
    });

    // Manejador de mensajes generales
    this.bot.on("message", (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        const chatId = msg.chat.id;
        this.bot.sendMessage(
          chatId,
          "Gracias por tu mensaje. Un representante te responderá pronto.\n" +
            "Mientras tanto, puedes usar los botones del menú principal:",
          { reply_markup: this.getMainMenuKeyboard() }
        );
      }
    });

    // Manejador de errores
    this.bot.on("error", (error) => {
      this.logger.error("Error en el bot de Telegram:", error);
    });
  }

  // Métodos para los diferentes menús y acciones
  private async mostrarMenuPrincipal(
    chatId: number,
    userName?: string
  ): Promise<void> {
    const welcomeMessage = userName
      ? `¡Hola ${userName}! 👋\n\n`
      : "¡Bienvenido! 👋\n\n";

    await this.bot.sendMessage(
      chatId,
      welcomeMessage + "Por favor, selecciona una opción:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }

  private getMainMenuKeyboard(): TelegramKeyboard {
    return {
      inline_keyboard: [
        [
          { text: "📅 Ver mis citas", callback_data: "ver_citas" },
          { text: "➕ Nueva cita", callback_data: "nueva_cita" },
        ],
        [
          { text: "❌ Cancelar cita", callback_data: "cancelar_cita" },
          { text: "📞 Contacto", callback_data: "contacto" },
        ],
      ],
    };
  }

  private async mostrarCitas(chatId: number): Promise<void> {
    // Aquí implementarías la lógica para obtener las citas del usuario
    const citasEjemplo = [
      { fecha: "2024-01-20", hora: "10:00", doctor: "Dr. Smith" },
      { fecha: "2024-01-25", hora: "15:30", doctor: "Dra. Johnson" },
    ];

    if (citasEjemplo.length === 0) {
      await this.bot.sendMessage(
        chatId,
        "No tienes citas programadas actualmente.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Volver", callback_data: "menu_principal" }],
            ],
          },
        }
      );
      return;
    }

    let mensaje = "📅 Tus citas programadas:\n\n";
    citasEjemplo.forEach((cita, index) => {
      mensaje += `${index + 1}. Fecha: ${cita.fecha}\n⏰ Hora: ${
        cita.hora
      }\n👨‍⚕️ Doctor: ${cita.doctor}\n\n`;
    });

    await this.bot.sendMessage(chatId, mensaje, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Volver", callback_data: "menu_principal" }],
        ],
      },
    });
  }

  private async iniciarNuevaCita(chatId: number): Promise<void> {
    const keyboard: TelegramKeyboard = {
      inline_keyboard: [
        [
          { text: "Medicina General", callback_data: "especialidad_general" },
          { text: "Pediatría", callback_data: "especialidad_pediatria" },
        ],
        [
          { text: "Cardiología", callback_data: "especialidad_cardiologia" },
          { text: "Dermatología", callback_data: "especialidad_dermatologia" },
        ],
        [{ text: "🔙 Volver al menú", callback_data: "menu_principal" }],
      ],
    };

    await this.bot.sendMessage(
      chatId,
      "👨‍⚕️ Selecciona la especialidad para tu nueva cita:",
      { reply_markup: keyboard }
    );
  }

  private async seleccionarEspecialidad(
    chatId: number,
    especialidad: string
  ): Promise<void> {
    // Aquí implementarías la lógica para mostrar horarios disponibles
    await this.bot.sendMessage(
      chatId,
      `Has seleccionado ${especialidad}. Esta función estará disponible próximamente.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Volver", callback_data: "nueva_cita" }],
          ],
        },
      }
    );
  }

  private async mostrarCitasParaCancelar(chatId: number): Promise<void> {
    // Aquí implementarías la lógica para obtener las citas del usuario
    const citasEjemplo = [
      { id: "1", fecha: "2024-01-20", hora: "10:00", doctor: "Dr. Smith" },
      { id: "2", fecha: "2024-01-25", hora: "15:30", doctor: "Dra. Johnson" },
    ];

    if (citasEjemplo.length === 0) {
      await this.bot.sendMessage(
        chatId,
        "No tienes citas que puedas cancelar.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Volver", callback_data: "menu_principal" }],
            ],
          },
        }
      );
      return;
    }

    const keyboard: TelegramKeyboard = {
      inline_keyboard: [
        ...citasEjemplo.map((cita) => [
          {
            text: `${cita.fecha} ${cita.hora} - ${cita.doctor}`,
            callback_data: `cancelar_${cita.id}`,
          },
        ]),
        [{ text: "🔙 Volver al menú", callback_data: "menu_principal" }],
      ],
    };

    await this.bot.sendMessage(
      chatId,
      "❌ Selecciona la cita que deseas cancelar:",
      { reply_markup: keyboard }
    );
  }

  private async confirmarCancelacion(
    chatId: number,
    citaId: string
  ): Promise<void> {
    // Aquí implementarías la lógica para cancelar la cita
    await this.bot.sendMessage(chatId, `La cita ${citaId} ha sido cancelada.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Volver", callback_data: "menu_principal" }],
        ],
      },
    });
  }

  private async mostrarContacto(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📞 Información de contacto:\n\n" +
        "🏥 Centro Médico XYZ\n" +
        "📍 Dirección: [Tu dirección]\n" +
        "☎️ Teléfono: [Tu teléfono]\n" +
        "📧 Email: [Tu email]\n" +
        "⏰ Horario: Lunes a Viernes 8:00 AM - 5:00 PM",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Volver", callback_data: "menu_principal" }],
          ],
        },
      }
    );
  }

  private async mostrarAyuda(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📋 Comandos disponibles:\n\n" +
        "/start - Iniciar el bot\n" +
        "/help - Ver esta lista de comandos\n\n" +
        "También puedes usar los botones del menú principal:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }

  // Métodos existentes para notificaciones
  async sendAppointmentNotification(
    chatId: number,
    appointment: AppointmentNotification
  ): Promise<boolean> {
    const message = `
🏥 Recordatorio de Cita Médica

📅 Fecha: ${appointment.date}
⏰ Hora: ${appointment.time}
👨‍⚕️ Doctor: ${appointment.doctorName}
🏢 Consultorio: ${appointment.location}

ℹ️ Por favor, llegue 10 minutos antes de su cita.
🎫 Presente este mensaje en recepción.

¿Necesita cancelar o reprogramar?
Use los botones del menú principal.
    `;

    return this.sendMessage(chatId, message);
  }

  async sendMessage(chatId: number, message: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      this.logger.error("Error enviando mensaje:", error);
      return false;
    }
  }
}
