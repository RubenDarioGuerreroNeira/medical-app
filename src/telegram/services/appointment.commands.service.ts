import { Injectable, Logger } from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import TelegramBot from "node-telegram-bot-api";
import * as moment from "moment-timezone";

@Injectable()
export class AppointmentCommands {
  private readonly logger = new Logger(AppointmentCommands.name);
  private userStates: Map<number, any> = new Map();

  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly bot: TelegramBot
  ) {}

  setupCommands() {
    this.bot.onText(/\/nuevacita/, async (msg) => {
      const chatId = msg.chat.id;
      await this.iniciarCreacionCita(chatId);
    });

    this.bot.onText(/\/miscitas/, async (msg) => {
      const chatId = msg.chat.id;
      await this.mostrarCitas(chatId);
    });

    this.bot.on("callback_query", async (callbackQuery) => {
      if (!callbackQuery.data) return;

      const chatId = callbackQuery.message?.chat.id;
      if (!chatId) return;

      if (callbackQuery.data === "nuevacita") {
        await this.iniciarCreacionCita(chatId);
      } else if (callbackQuery.data === "ver_citas") {
        await this.mostrarCitas(chatId);
      } else if (callbackQuery.data.startsWith("edit_appointment_")) {
        const appointmentId = parseInt(callbackQuery.data.split("_")[2]);
        await this.iniciarEdicionCita(chatId, appointmentId);
      } else if (callbackQuery.data.startsWith("delete_appointment_")) {
        const appointmentId = parseInt(callbackQuery.data.split("_")[2]);
        await this.confirmarEliminarCita(chatId, appointmentId);
      } else if (callbackQuery.data === "confirm_delete_appointment") {
        const state = this.userStates.get(chatId);
        if (state && state.appointmentToDelete) {
          await this.eliminarCita(chatId, state.appointmentToDelete);
        }
      } else if (callbackQuery.data === "cancel_delete_appointment") {
        await this.bot.sendMessage(chatId, "❌ Eliminación cancelada");
        this.userStates.delete(chatId);
      }
    });
  }

  // Añadir este método a la clase AppointmentCommands
  public async mostrarMenuCitas(chatId: number) {
    await this.bot.sendMessage(
      chatId,
      "📅 *Gestión de Citas Médicas*\n\nPuedes programar y administrar tus citas médicas.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➕ Crear nueva cita",
                callback_data: "nuevacita",
              },
            ],
            [
              {
                text: "📋 Ver mis citas",
                callback_data: "ver_citas",
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
      }
    );
  }

  async iniciarCreacionCita(chatId: number) {
    this.userStates.set(chatId, {
      step: "doctor_name",
      appointmentData: {},
    });

    await this.bot.sendMessage(
      chatId,
      "👨‍⚕️ Por favor, ingresa el nombre del doctor:"
    );

    // Configurar manejador de mensajes para el proceso de creación
    this.setupAppointmentMessageHandler(chatId);
  }

  private setupAppointmentMessageHandler(chatId: number) {
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId || !msg.text) return;

      const state = this.userStates.get(chatId);
      if (!state) return;

      switch (state.step) {
        case "doctor_name":
          state.appointmentData.doctorName = msg.text;
          state.step = "specialty";
          await this.bot.sendMessage(
            chatId,
            "🔬 ¿Cuál es la especialidad médica?"
          );
          break;

        case "specialty":
          state.appointmentData.specialty = msg.text;
          state.step = "date";
          await this.bot.sendMessage(
            chatId,
            "📅 ¿En qué fecha es la cita? (Formato: YYYY-MM-DD, ejemplo: 2023-12-31)"
          );
          break;

        case "date":
          try {
            const dateObj = moment(msg.text, "YYYY-MM-DD");
            if (!dateObj.isValid()) {
              throw new Error("Formato de fecha inválido");
            }
            state.appointmentData.appointmentDate = msg.text;
            state.step = "time";
            await this.bot.sendMessage(
              chatId,
              "⏰ ¿A qué hora es la cita? (Formato: HH:MM, ejemplo: 14:30)"
            );
          } catch (error) {
            await this.bot.sendMessage(
              chatId,
              "❌ Formato de fecha inválido. Por favor, usa el formato YYYY-MM-DD (ejemplo: 2023-12-31)"
            );
          }
          break;

        case "time":
          try {
            state.appointmentData.appointmentTime = msg.text;
            state.step = "medical_center";
            await this.bot.sendMessage(
              chatId,
              "🏥 ¿En qué centro médico es la cita?"
            );
          } catch (error) {
            await this.bot.sendMessage(
              chatId,
              "❌ Formato de hora inválido. Por favor, usa el formato HH:MM (ejemplo: 14:30)"
            );
          }
          break;

        case "medical_center":
          state.appointmentData.medicalCenterName = msg.text;
          state.step = "location";
          await this.bot.sendMessage(
            chatId,
            "📍 ¿Cuál es la ubicación del centro médico? (Opcional, envía 'N/A' si no deseas especificar)"
          );
          break;

        case "location":
          state.appointmentData.medicalCenterLocation =
            msg.text === "N/A" ? "" : msg.text;
          state.step = "phone";
          await this.bot.sendMessage(
            chatId,
            "📞 ¿Cuál es el número de teléfono de contacto? (Opcional, envía 'N/A' si no deseas especificar)"
          );
          break;

        case "phone":
          state.appointmentData.phoneNumber =
            msg.text === "N/A" ? "" : msg.text;
          state.step = "notes";
          await this.bot.sendMessage(
            chatId,
            "📝 ¿Deseas agregar alguna nota adicional? (Opcional, envía 'N/A' si no deseas especificar)"
          );
          break;

        case "notes":
          state.appointmentData.notes = msg.text === "N/A" ? "" : msg.text;
          await this.finalizarCreacionCita(chatId, state.appointmentData);
          break;
      }
    };

    // Registrar el manejador de mensajes
    this.bot.on("message", messageHandler);
  }

  private async finalizarCreacionCita(chatId: number, appointmentData: any) {
    try {
      const appointment = await this.appointmentService.createAppointment(
        chatId,
        appointmentData
      );

      const formattedDate = moment(appointment.appointmentDate).format(
        "DD/MM/YYYY"
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Cita médica creada exitosamente:\n\n` +
          `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
          `🔬 Especialidad: ${appointment.specialty}\n` +
          `📅 Fecha: ${formattedDate}\n` +
          `⏰ Hora: ${appointment.appointmentTime}\n` +
          `🏥 Centro Médico: ${appointment.medicalCenterName}\n` +
          (appointment.medicalCenterLocation
            ? `📍 Ubicación: ${appointment.medicalCenterLocation}\n`
            : "") +
          (appointment.phoneNumber
            ? `📞 Teléfono: ${appointment.phoneNumber}\n`
            : "") +
          (appointment.notes ? `📝 Notas: ${appointment.notes}\n` : ""),
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Ver mis citas",
                  callback_data: "ver_citas",
                },
              ],
            ],
          },
        }
      );

      // Limpiar el estado del usuario
      this.userStates.delete(chatId);
    } catch (error) {
      this.logger.error(`Error al crear cita: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al crear la cita. Por favor, intenta nuevamente."
      );
    }
  }

  async mostrarCitas(chatId: number) {
    try {
      const appointments = await this.appointmentService.getUserAppointments(
        chatId
      );

      if (appointments.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "No tienes citas médicas programadas."
        );
        return;
      }

      let message = "📋 Tus citas médicas:\n\n";
      const inlineKeyboard = [];

      for (const appointment of appointments) {
        const formattedDate = moment(appointment.appointmentDate).format(
          "DD/MM/YYYY"
        );

        message += `🏥 ${appointment.medicalCenterName}\n`;
        message += `👨‍⚕️ Dr. ${appointment.doctorName} - ${appointment.specialty}\n`;
        message += `📅 ${formattedDate} ⏰ ${appointment.appointmentTime}\n\n`;

        inlineKeyboard.push([
          {
            text: `✏️ Editar`,
            callback_data: `edit_appointment_${appointment.id}`,
          },
          {
            text: `🗑️ Eliminar`,
            callback_data: `delete_appointment_${appointment.id}`,
          },
        ]);
      }

      await this.bot.sendMessage(chatId, message, {
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      this.logger.error(`Error al mostrar citas: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al obtener tus citas. Por favor, intenta nuevamente."
      );
    }
  }

  private async iniciarEdicionCita(chatId: number, appointmentId: number) {
    try {
      // Implementación pendiente
      await this.bot.sendMessage(chatId, "Función de edición en desarrollo");
    } catch (error) {
      this.logger.error(`Error al iniciar edición: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al iniciar la edición"
      );
    }
  }

  private async confirmarEliminarCita(chatId: number, appointmentId: number) {
    try {
      this.userStates.set(chatId, {
        appointmentToDelete: appointmentId,
      });

      await this.bot.sendMessage(
        chatId,
        "¿Estás seguro de que deseas eliminar esta cita médica?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "✅ Sí, eliminar",
                  callback_data: "confirm_delete_appointment",
                },
                {
                  text: "❌ No, cancelar",
                  callback_data: "cancel_delete_appointment",
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(`Error al confirmar eliminación: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al procesar la solicitud"
      );
    }
  }

  private async eliminarCita(chatId: number, appointmentId: number) {
    try {
      await this.appointmentService.deleteAppointment(appointmentId);
      await this.bot.sendMessage(chatId, "✅ Cita eliminada exitosamente");
      this.userStates.delete(chatId);
    } catch (error) {
      this.logger.error(`Error al eliminar cita: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al eliminar la cita"
      );
    }
  }
}
