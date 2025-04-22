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
    // Otros manejadores...
    this.bot.removeAllListeners("callback_query");
    this.bot.on("callback_query", async (callbackQuery) => {
      if (!callbackQuery.message) return;
      const chatId = callbackQuery.message.chat.id;

      if (callbackQuery.data === "nuevacita") {
        await this.iniciarCreacionCita(chatId);
      } else if (callbackQuery.data === "ver_citas") {
        await this.mostrarCitasConIds(chatId, "show");
      } else if (callbackQuery.data === "select_edit_appointment") {
        await this.bot.sendMessage(
          chatId,
          "✏️ Por favor, ingresa el ID de la cita que deseas editar:"
        );
        this.setupEditAppointmentHandler(chatId);
      } else if (callbackQuery.data === "select_delete_appointment") {
        await this.bot.sendMessage(
          chatId,
          "🗑️ Por favor, ingresa el ID de la cita que deseas eliminar:"
        );
        this.setupDeleteAppointmentHandler(chatId);
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
                text: "📋 Ver ó Editar mis citas",
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
    // elimina cualquier manejador previo para evitar redundancia
    this.bot.removeAllListeners("message");
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId || !msg.text) return;

      const state = this.userStates.get(chatId);
      if (!state) return;
      try {
        // Definir timeRegex aquí para que esté disponible en todos los casos
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // Validar formato HH:MM

        switch (state.step) {
          case "doctor_name":
            if (msg.text.trim().length === 0) {
              await this.bot.sendMessage(
                chatId,
                "❌ El nombre del doctor no puede estar vacío. Por favor, ingrésalo nuevamente."
              );
              return;
            }
            state.appointmentData.doctorName = msg.text;
            state.step = "specialty";
            await this.bot.sendMessage(
              chatId,
              "🔬 ¿Cuál es la especialidad médica?"
            );
            break;

          case "specialty":
            if (msg.text.trim().length === 0) {
              await this.bot.sendMessage(
                chatId,
                "❌ La especialidad no puede estar vacía. Por favor, ingrésala nuevamente."
              );
              return;
            }
            state.appointmentData.specialty = msg.text;
            state.step = "date";
            await this.bot.sendMessage(
              chatId,
              "📅 ¿En qué fecha es la cita? (Formato: DD-MM-AAAA, ejemplo: 21-05-2025)"
            );
            break;

          case "date":
            try {
              const dateObj = moment(msg.text, "DD-MM-YYYY", true);
              if (!dateObj.isValid()) {
                throw new Error("Formato de fecha inválido");
              }
              state.appointmentData.appointmentDate = msg.text; // Guardar en formato original
              state.step = "time";
              await this.bot.sendMessage(
                chatId,
                "⏰ ¿A qué hora es la cita? (Ejemplo: 02:30 PM o 14:30)"
              );
            } catch (error) {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de fecha inválido. Por favor, usa el formato DD-MM-YYYY (ejemplo: 21-05-2025)"
              );
            }
            break;

          case "time":
            // Modificar la expresión regular para aceptar formato AM/PM
            // Formato 12h: 1:30 PM, 03:45 am, etc.
            // Formato 24h: 13:30, 03:45, etc.
            const timeRegexAMPM =
              /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(am|pm|AM|PM)$/;
            const timeRegex24h = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

            if (!timeRegexAMPM.test(msg.text) && !timeRegex24h.test(msg.text)) {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de hora inválido. Por favor, usa el formato HH:MM AM/PM (ejemplo: 02:30 PM) o HH:MM (ejemplo: 14:30)"
              );
              return;
            }

            state.appointmentData.appointmentTime = msg.text;

            state.step = "medical_center";
            await this.bot.sendMessage(
              chatId,
              "🏥 ¿En qué centro médico es la cita?"
            );
            break;

          case "medical_center":
            if (msg.text.trim().length === 0) {
              await this.bot.sendMessage(
                chatId,
                "❌ El nombre del centro médico no puede estar vacío. Por favor, ingrésalo nuevamente."
              );
              return;
            }
            state.appointmentData.medicalCenterName = msg.text;
            state.step = "location";
            await this.bot.sendMessage(
              chatId,
              "📍 ¿Cuál es la ubicación del centro médico? (Opcional, envía 'N' si no deseas especificar)"
            );
            break;

          case "location":
            state.appointmentData.medicalCenterLocation =
              msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
            state.step = "phone";
            await this.bot.sendMessage(
              chatId,
              "📞 ¿Cuál es el número de teléfono de contacto? (Opcional, envía 'N' si no deseas especificar)"
            );
            break;

          case "phone":
            state.appointmentData.phoneNumber =
              msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
            state.step = "notes";
            await this.bot.sendMessage(
              chatId,
              "📝 ¿Deseas agregar alguna nota adicional? (Opcional, envía 'N' si no deseas especificar)"
            );
            break;

          case "notes":
            state.appointmentData.notes =
              msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
            await this.finalizarCreacionCita(chatId, state.appointmentData);
            break;

          // Edición de citas
          case "edit_doctor_name":
            if (msg.text.trim().length === 0) {
              await this.bot.sendMessage(
                chatId,
                "❌ El nombre del doctor no puede estar vacío. Por favor, ingrésalo nuevamente."
              );
              return;
            }
            state.appointmentData.doctorName = msg.text;
            state.step = "edit_specialty";
            await this.bot.sendMessage(
              chatId,
              "🔬 ¿Cuál es la nueva especialidad médica?"
            );
            break;

          case "edit_specialty":
            state.appointmentData.specialty = msg.text;

            state.step = "edit_date";
            await this.bot.sendMessage(
              chatId,
              "📅 ¿Cuál es la nueva fecha de la cita? (Formato: DD-MM-AAAA)"
            );
            break;

          case "edit_date":
            try {
              const dateObj = moment(msg.text, "DD-MM-YYYY", true);
              if (!dateObj.isValid()) {
                throw new Error("Formato de fecha inválido");
              }
              state.appointmentData.appointmentDate = msg.text;
              // guarda en formato original

              state.step = "edit_time";
              await this.bot.sendMessage(
                chatId,
                "⏰ ¿Cuál es la nueva hora de la cita? (Formato: HH:MM, ejemplo 02:30 pm ó 14:30)"
              );
            } catch (error) {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de fecha inválido. Por favor, usa el formato DD-MM-AAAA, (ejemplo: 29-09-2025)"
              );
            }
            break;

          case "edit_time":
            const editTimeRegexAMPM =
              /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(am|pm|AM|PM)$/;
            const editTimeRegex24h = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

            if (
              !editTimeRegexAMPM.test(msg.text) &&
              !editTimeRegex24h.test(msg.text)
            ) {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de hora inválido. Por favor, usa el formato HH:MM AM/PM (ejemplo: 02:30 PM) o HH:MM (ejemplo:02:30 PM ó 14:30)"
              );
              return;
            }
            state.appointmentData.appointmentTime = msg.text;
            state.step = "edit_medical_center";
            await this.bot.sendMessage(
              chatId,
              "🏥 ¿Cuál es el nuevo centro médico?"
            );
            break;

          case "edit_medical_center":
            state.appointmentData.medicalCenterName = msg.text;
            await this.finalizarEdicionCita(chatId, state.appointmentData);
            break;

          default:
            await this.bot.sendMessage(
              chatId,
              "❌ Ocurrió un error inesperado. Por favor, intenta nuevamente."
            );
            break;
        }
      } catch (error) {
        this.logger.error(`Error en el flujo de mensajes: ${error.message}`);
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error inesperado. Por favor, intenta nuevamente."
        );
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
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
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
        "❌ Ocurrió un error al crear la cita. Por favor, intenta nuevamente.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "ver_citas",
                },
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

  private async finalizarEdicionCita(chatId: number, appointmentData: any) {
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
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
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
        "❌ Ocurrió un error al actualizar la cita. Por favor, intenta nuevamente.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "ver_citas",
                },
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

  private async iniciarEdicionCita(chatId: number, appointmentId: number) {
    this.bot.removeAllListeners("message");
    try {
      const appointment = await this.appointmentService.getAppointmentById(
        appointmentId
      );

      if (!appointment) {
        await this.bot.sendMessage(chatId, "❌ No se encontró la cita médica.");
        return;
      }

      this.userStates.set(chatId, {
        step: "edit_doctor_name",
        appointmentData: { ...appointment },
      });

      await this.bot.sendMessage(
        chatId,
        `✏️ Editando cita médica:\n\n` +
          `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
          `🔬 Especialidad: ${appointment.specialty}\n` +
          `📅 Fecha: ${appointment.appointmentDate}\n` +
          `⏰ Hora: ${appointment.appointmentTime}\n` +
          `🏥 Centro Médico: ${appointment.medicalCenterName}\n\n` +
          `Por favor, ingresa el nuevo nombre del doctor (o escribe el mismo nombre para no cambiarlo):`
      );

      this.setupAppointmentMessageHandler(chatId);
    } catch (error) {
      this.logger.error(`Error al iniciar edición: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al iniciar la edición de la cita.",
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

  private async confirmarEliminarCita(chatId: number, appointmentId: number) {
    this.bot.removeAllListeners("message");
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

  private async mostrarCitasConIds(
    chatId: number,
    action: "show" | "edit" | "delete"
  ) {
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

      // Mostrar lista de citas con sus IDs
      let message = "📋 *Tus citas médicas:*\n\n";
      for (const appointment of appointments) {
        const formattedDate = moment(appointment.appointmentDate).format(
          "DD/MM/YYYY"
        );

        message += `🆔 *ID: ${appointment.id}*\n`;
        message += `🏥 ${appointment.medicalCenterName}\n`;
        message += `👨‍⚕️ Dr. ${appointment.doctorName} - ${appointment.specialty}\n`;
        message += `📅 ${formattedDate} ⏰ ${appointment.appointmentTime}\n\n`;
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });

      // Preguntar qué acción desea realizar
      await this.bot.sendMessage(chatId, "¿Qué acción deseas realizar?", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✏️ Editar una cita",
                callback_data: "select_edit_appointment",
              },
              {
                text: "🗑️ Eliminar una cita",
                callback_data: "select_delete_appointment",
              },
            ],
            [
              { text: "➕ Nueva cita", callback_data: "nuevacita" },
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
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

  private setupDeleteAppointmentHandler(chatId: number) {
    // Eliminar cualquier manejador previo para evitar duplicados
    this.bot.removeAllListeners("message");

    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId || !msg.text) return;

      const appointmentId = parseInt(msg.text.trim());
      if (isNaN(appointmentId)) {
        await this.bot.sendMessage(
          chatId,
          "❌ ID inválido. Por favor, ingresa un número válido."
        );
        return;
      }

      try {
        const appointment = await this.appointmentService.getAppointmentById(
          appointmentId
        );

        if (!appointment) {
          await this.bot.sendMessage(
            chatId,
            "❌ No se encontró una cita con ese ID. Por favor, intenta nuevamente."
          );
          return;
        }

        // Configurar el estado del usuario para la eliminación
        this.userStates.set(chatId, {
          appointmentToDelete: appointmentId,
        });

        await this.bot.sendMessage(
          chatId,
          `🗑️ ¿Estás seguro de que deseas eliminar esta cita médica?\n\n` +
            `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
            `🔬 Especialidad: ${appointment.specialty}\n` +
            `📅 Fecha: ${appointment.appointmentDate}\n` +
            `⏰ Hora: ${appointment.appointmentTime}\n` +
            `🏥 Centro Médico: ${appointment.medicalCenterName}`,
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
        this.logger.error(`Error al obtener cita: ${error.message}`);
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al buscar la cita. Por favor, intenta nuevamente."
        );
      }
    };

    // Registrar el manejador de mensajes
    this.bot.on("message", messageHandler);
  }

  private setupEditAppointmentHandler(chatId: number) {
    // Eliminar cualquier manejador previo para evitar duplicados
    this.bot.removeAllListeners("message");

    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId || !msg.text) return;

      // Eliminar el manejador después de recibir el mensaje
      this.bot.removeListener("message", messageHandler);

      const appointmentId = parseInt(msg.text.trim());
      if (isNaN(appointmentId)) {
        await this.bot.sendMessage(
          chatId,
          "❌ ID inválido. Por favor, ingresa un número válido."
        );
        return;
      }

      try {
        const appointment = await this.appointmentService.getAppointmentById(
          appointmentId
        );

        if (!appointment) {
          await this.bot.sendMessage(
            chatId,
            "❌ No se encontró una cita con ese ID. Por favor, intenta nuevamente."
          );
          return;
        }

        // Configurar el estado del usuario para la edición
        this.userStates.set(chatId, {
          step: "edit_doctor_name",
          appointmentData: { ...appointment },
        });

        await this.bot.sendMessage(
          chatId,
          `✏️ Editando cita médica:\n\n` +
            `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
            `🔬 Especialidad: ${appointment.specialty}\n` +
            `📅 Fecha: ${appointment.appointmentDate}\n` +
            `⏰ Hora: ${appointment.appointmentTime}\n` +
            `🏥 Centro Médico: ${appointment.medicalCenterName}\n\n` +
            `Por favor, ingresa el nuevo nombre del doctor (o escribe el mismo nombre para no cambiarlo):`
        );

        // Configurar el manejador para el flujo de edición
        this.setupAppointmentMessageHandler(chatId);
      } catch (error) {
        this.logger.error(`Error al obtener cita: ${error.message}`);
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al buscar la cita. Por favor, intenta nuevamente."
        );
      }
    };

    // Registrar el manejador de mensajes
    this.bot.on("message", messageHandler);
  }

  private async eliminarCita(chatId: number, appointmentId: number) {
    this.bot.removeAllListeners("message");
    try {
      await this.appointmentService.deleteAppointment(appointmentId);
      await this.bot.sendMessage(chatId, "✅ Cita eliminada exitosamente", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📋 Volver al menú de citas",
                callback_data: "ver_citas",
              },
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });
      this.userStates.delete(chatId);
    } catch (error) {
      this.logger.error(`Error al eliminar cita: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al eliminar la cita",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "ver_citas",
                },
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
