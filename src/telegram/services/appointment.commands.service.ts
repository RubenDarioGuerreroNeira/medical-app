import { Inject, Injectable, Logger } from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import TelegramBot from "node-telegram-bot-api";
import * as moment from "moment-timezone";
import { TelegramStateService } from "./telegram-state.service";

@Injectable()
export class AppointmentCommands {
  private readonly logger = new Logger(AppointmentCommands.name);

  constructor(
    private readonly appointmentService: AppointmentService,
    @Inject('TELEGRAM_BOT') private readonly bot: TelegramBot,
    private readonly stateService: TelegramStateService
  ) {}

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
    await this.stateService.set(chatId, {
      currentOperation: "create_appointment",
      step: "awaiting_doctor_name", // Cambiado para reflejar que esperamos este dato
      appointmentData: {},
    });

    await this.bot.sendMessage(
      chatId,
      "👨‍⚕️ Por favor, ingresa el nombre del doctor:"
    );
    // TelegramService enrutará la respuesta del usuario a handleUserInput
  }

  public async handleAppointmentCallback(
    chatId: number,
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const data = callbackQuery.data;
    if (!data) return;

    // TelegramService ya debería haber respondido al callbackQuery.id

    if (data === "nuevacita") {
      await this.iniciarCreacionCita(chatId);
    } else if (data === "ver_citas") {
      await this.mostrarCitasConIds(chatId, "show"); // "show" es un placeholder, ajustar según necesidad
    } else if (data === "select_edit_appointment") {
      await this.stateService.set(chatId, {
        currentOperation: "edit_appointment",
        step: "awaiting_id_for_edit",
      });
      await this.bot.sendMessage(
        chatId,
        "✏️ Por favor, ingresa el ID de la cita que deseas editar:"
      );
    } else if (data === "select_delete_appointment") {
      await this.stateService.set(chatId, {
        currentOperation: "delete_appointment",
        step: "awaiting_id_for_delete",
      });
      await this.bot.sendMessage(
        chatId,
        "🗑️ Por favor, ingresa el ID de la cita que deseas eliminar:"
      );
    } else if (data.startsWith("edit_appointment_")) {
      const appointmentId = parseInt(data.split("_")[2]);
      await this.iniciarEdicionCita(chatId, appointmentId);
    } else if (data.startsWith("delete_appointment_")) {
      const appointmentId = parseInt(data.split("_")[2]);
      await this.confirmarEliminarCita(chatId, appointmentId);
    } else if (data === "confirm_delete_appointment") {
      const state = await this.stateService.get(chatId);
      if (state && state.appointmentToDeleteId) {
        await this.eliminarCita(chatId, state.appointmentToDeleteId);
      }
      await this.stateService.delete(chatId); // Limpiar estado después de la operación
    } else if (data === "cancel_delete_appointment") {
      await this.bot.sendMessage(chatId, "❌ Eliminación cancelada");
      await this.stateService.delete(chatId); // Limpiar estado
    }
  }

  public async handleUserInput(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    if (!msg.text) return;

    const state = await this.stateService.get(chatId);
    if (
      !state ||
      (state.currentOperation !== "create_appointment" &&
        state.currentOperation !== "edit_appointment" &&
        state.currentOperation !== "delete_appointment")
    ) {
      // No está en un flujo de citas o el estado es incorrecto
      return;
    }

    try {
      // Manejar entrada de ID para editar/eliminar primero
      if (state.step === "awaiting_id_for_edit") {
        const appointmentId = parseInt(msg.text.trim());
        if (isNaN(appointmentId)) {
          await this.bot.sendMessage(
            chatId,
            "❌ ID inválido. Por favor, ingresa un número válido."
          );
          return;
        }
        await this.iniciarEdicionCita(chatId, appointmentId);
        return;
      } else if (state.step === "awaiting_id_for_delete") {
        const appointmentId = parseInt(msg.text.trim());
        if (isNaN(appointmentId)) {
          await this.bot.sendMessage(
            chatId,
            "❌ ID inválido. Por favor, ingresa un número válido."
          );
          return;
        }
        // En lugar de llamar a setupDeleteAppointmentHandler, procesamos directamente
        await this.processIdForDelete(chatId, appointmentId);
        return;
      }

      // Lógica de creación/edición de citas basada en state.step
      switch (state.step) {
        // --- Flujo de Creación ---
        case "awaiting_doctor_name":
          if (msg.text.trim().length === 0) {
            await this.bot.sendMessage(
              chatId,
              "❌ El nombre del doctor no puede estar vacío. Por favor, ingrésalo nuevamente."
            );
            return;
          }
          state.appointmentData.doctorName = msg.text;
          state.step = "awaiting_specialty";
          await this.stateService.set(chatId, state); // Guardar estado actualizado
          await this.bot.sendMessage(
            chatId,
            "🔬 ¿Cuál es la especialidad médica?"
          );
          break;

        case "awaiting_specialty":
          if (msg.text.trim().length === 0) {
            await this.bot.sendMessage(
              chatId,
              "❌ La especialidad no puede estar vacía. Por favor, ingrésala nuevamente."
            );
            return;
          }
          state.appointmentData.specialty = msg.text;
          state.step = "awaiting_date";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "📅 ¿En qué fecha es la cita? (Formato: DD-MM-AAAA, ejemplo: 21-05-2025)"
          );
          break;

        case "awaiting_date":
          try {
            const dateObj = moment(msg.text, "DD-MM-YYYY", true);
            if (!dateObj.isValid()) {
              throw new Error("Formato de fecha inválido");
            }
            state.appointmentData.appointmentDate = msg.text; // Guardar en formato original
            state.step = "awaiting_time";
            await this.stateService.set(chatId, state);
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

        case "awaiting_time":
          const timeRegexAMPM = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(am|pm|AM|PM)$/;
          const timeRegex24h = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
          if (!timeRegexAMPM.test(msg.text) && !timeRegex24h.test(msg.text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ Formato de hora inválido. Por favor, usa el formato HH:MM AM/PM (ejemplo: 02:30 PM) o HH:MM (ejemplo: 14:30)"
            );
            return;
          }
          state.appointmentData.appointmentTime = msg.text;
          state.step = "awaiting_medical_center";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "🏥 ¿En qué centro médico es la cita?"
          );
          break;

        case "awaiting_medical_center":
          if (msg.text.trim().length === 0) {
            await this.bot.sendMessage(
              chatId,
              "❌ El nombre del centro médico no puede estar vacío. Por favor, ingrésalo nuevamente."
            );
            return;
          }
          state.appointmentData.medicalCenterName = msg.text;
          state.step = "awaiting_location";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "📍 ¿Cuál es la ubicación del centro médico? (Opcional, envía 'N' si no deseas especificar)"
          );
          break;

        case "awaiting_location":
          state.appointmentData.medicalCenterLocation =
            msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
          state.step = "awaiting_phone";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "📞 ¿Cuál es el número de teléfono de contacto? (Opcional, envía 'N' si no deseas especificar)"
          );
          break;

        case "awaiting_phone":
          state.appointmentData.phoneNumber =
            msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
          state.step = "awaiting_notes";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "📝 ¿Deseas agregar alguna nota adicional? (Opcional, envía 'N' si no deseas especificar)"
          );
          break;

        case "awaiting_notes":
          state.appointmentData.notes =
            msg.text.trim().toUpperCase() === "N" ? "" : msg.text;
          await this.finalizarCreacionCita(chatId, state.appointmentData);
          // El estado se limpia en finalizarCreacionCita
          break;

        // --- Flujo de Edición ---
        case "awaiting_edit_doctor_name":
          if (msg.text.trim().length === 0) {
            await this.bot.sendMessage(
              chatId,
              "❌ El nombre del doctor no puede estar vacío. Por favor, ingrésalo nuevamente."
            );
            return;
          }
          state.appointmentData.doctorName = msg.text;
          state.step = "awaiting_edit_specialty";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "🔬 ¿Cuál es la nueva especialidad médica?"
          );
          break;

        case "awaiting_edit_specialty":
          state.appointmentData.specialty = msg.text;
          state.step = "awaiting_edit_date";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "📅 ¿Cuál es la nueva fecha de la cita? (Formato: DD-MM-AAAA)"
          );
          break;

        case "awaiting_edit_date":
          try {
            const dateObj = moment(msg.text, "DD-MM-YYYY", true);
            if (!dateObj.isValid()) {
              throw new Error("Formato de fecha inválido");
            }
            state.appointmentData.appointmentDate = msg.text;
            state.step = "awaiting_edit_time";
            await this.stateService.set(chatId, state);
            await this.bot.sendMessage(
              chatId,
              "⏰ ¿Cuál es la nueva hora de la cita? (Formato: HH:MM AM/PM o HH:MM)"
            );
          } catch (error) {
            await this.bot.sendMessage(
              chatId,
              "❌ Formato de fecha inválido. Por favor, usa el formato DD-MM-AAAA (ejemplo: 29-09-2025)"
            );
          }
          break;

        case "awaiting_edit_time":
          const editTimeRegexAMPM =
            /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(am|pm|AM|PM)$/;
          const editTimeRegex24h = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
          if (
            !editTimeRegexAMPM.test(msg.text) &&
            !editTimeRegex24h.test(msg.text)
          ) {
            await this.bot.sendMessage(
              chatId,
              "❌ Formato de hora inválido. Por favor, usa el formato HH:MM AM/PM o HH:MM."
            );
            return;
          }
          state.appointmentData.appointmentTime = msg.text;
          state.step = "awaiting_edit_medical_center";
          await this.stateService.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "🏥 ¿Cuál es el nuevo centro médico?"
          );
          break;

        case "awaiting_edit_medical_center":
          state.appointmentData.medicalCenterName = msg.text;
          // El ID de la cita ya debería estar en state.appointmentData.id desde iniciarEdicionCita
          await this.finalizarEdicionCita(chatId, state.appointmentData);
          // El estado se limpia en finalizarEdicionCita
          break;

        default:
          this.logger.warn(
            `Estado desconocido en handleUserInput: ${state.step} para el chat ${chatId}`
          );
          // Podrías querer limpiar el estado aquí o enviar un mensaje de error genérico
          // await this.stateService.delete(chatId);
          // await this.bot.sendMessage(chatId, "❌ Ocurrió un error en el flujo. Por favor, intenta comenzar de nuevo.");
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error en handleUserInput para el chat ${chatId}, estado ${JSON.stringify(
          state
        )}: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error inesperado procesando tu respuesta. Por favor, intenta nuevamente."
      );
      // Considera limpiar el estado aquí también si el error es irrecuperable
      // await this.stateService.delete(chatId);
    }
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
    } catch (error) {
      this.logger.error(`Error al crear cita: ${error.message}`, error.stack);
      await this.bot.sendMessage(
        chatId,
        `❌ Ocurrió un error al crear la cita: ${error.message}. Por favor, intenta nuevamente.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "recordatorio_cita_medica", // O el callback del menú de citas
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
    } finally {
      await this.stateService.delete(chatId); // Limpiar el estado del usuario
    }
  }

  private async finalizarEdicionCita(chatId: number, appointmentData: any) {
    try {
      // Asegúrate de que appointmentData.id contiene el ID de la cita a actualizar
      if (!appointmentData.id) {
        throw new Error("ID de la cita no encontrado para la actualización.");
      }
      const appointment = await this.appointmentService.updateAppointment(
        appointmentData.id,
        appointmentData
      );

      const formattedDate = moment(appointment.appointmentDate).format(
        "DD/MM/YYYY"
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Cita médica actualizada exitosamente:\n\n` +
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
    } catch (error) {
      this.logger.error(
        `Error al actualizar cita: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        `❌ Ocurrió un error al actualizar la cita: ${error.message}. Por favor, intenta nuevamente.`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "recordatorio_cita_medica", // O el callback del menú de citas
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
    } finally {
      await this.stateService.delete(chatId); // Limpiar el estado del usuario
    }
  }

  private async iniciarEdicionCita(chatId: number, appointmentId: number) {
    try {
      const appointment = await this.appointmentService.getAppointmentById(
        appointmentId
      );

      if (!appointment) {
        await this.bot.sendMessage(chatId, "❌ No se encontró la cita médica.");
        return;
      }

      // Formatear la fecha para mostrarla correctamente
      const formattedDate = moment(appointment.appointmentDate).format(
        "DD/MM/YYYY"
      );

      await this.stateService.set(chatId, {
        currentOperation: "edit_appointment",
        step: "awaiting_edit_doctor_name",
        appointmentData: { ...appointment }, // Guardamos toda la cita, incluyendo su ID
      });

      await this.bot.sendMessage(
        chatId,
        `✏️ Editando cita médica (ID: ${appointment.id}):\n\n` +
          `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
          `🔬 Especialidad: ${appointment.specialty}\n` +
          `📅 Fecha: ${formattedDate}\n` + // Usar fecha formateada
          `⏰ Hora: ${appointment.appointmentTime}\n` +
          `🏥 Centro Médico: ${appointment.medicalCenterName}\n\n` +
          `Por favor, ingresa el nuevo nombre del doctor (o escribe el mismo nombre para no cambiarlo):`
      );
      // TelegramService enrutará la respuesta del usuario a handleUserInput
    } catch (error) {
      this.logger.error(
        `Error al iniciar edición: ${error.message}`,
        error.stack
      );
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
    try {
      const appointment = await this.appointmentService.getAppointmentById(
        appointmentId
      );
      if (!appointment) {
        await this.bot.sendMessage(
          chatId,
          "❌ No se encontró la cita médica para eliminar."
        );
        return;
      }

      await this.stateService.set(chatId, {
        currentOperation: "delete_appointment_confirmation", // Estado específico para la confirmación
        appointmentToDeleteId: appointmentId, // Guardar el ID de la cita a eliminar
      });

      const formattedDate = moment(appointment.appointmentDate).format(
        "DD/MM/YYYY"
      );

      await this.bot.sendMessage(
        chatId,
        `🗑️ ¿Estás seguro de que deseas eliminar esta cita médica (ID: ${appointment.id})?\n\n` +
          `👨‍⚕️ Doctor: ${appointment.doctorName}\n` +
          `🔬 Especialidad: ${appointment.specialty}\n` +
          `📅 Fecha: ${formattedDate}\n` +
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
      this.logger.error(
        `Error al confirmar eliminación: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al procesar la solicitud de eliminación."
      );
    }
  }

  private async mostrarCitasConIds(
    chatId: number,
    action: "show" | "edit" | "delete" // 'action' podría usarse para personalizar el mensaje si es necesario
  ) {
    try {
      const appointments = await this.appointmentService.getUserAppointments(
        chatId
      );

      if (appointments.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "No tienes citas médicas programadas.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "➕ Nueva cita", callback_data: "nuevacita" }],
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
        return;
      }

      let message = "📋 *Tus citas médicas:*\n\n";
      const inline_keyboard_buttons = [];

      for (const appointment of appointments) {
        const formattedDate = moment(appointment.appointmentDate).format(
          "DD/MM/YYYY"
        );
        message += `🆔 *ID: ${appointment.id}*\n`;
        message += `🏥 ${appointment.medicalCenterName}\n`;
        message += `👨‍⚕️ Dr. ${appointment.doctorName} - ${appointment.specialty}\n`;
        message += `📅 ${formattedDate} ⏰ ${appointment.appointmentTime}\n\n`;

        // Podríamos añadir botones por cada cita si la lista no es muy larga
        // inline_keyboard_buttons.push([
        //   { text: `✏️ ID ${appointment.id}`, callback_data: `edit_appointment_${appointment.id}` },
        //   { text: `🗑️ ID ${appointment.id}`, callback_data: `delete_appointment_${appointment.id}` }
        // ]);
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
      });

      // Preguntar qué acción desea realizar de forma general
      await this.bot.sendMessage(chatId, "¿Qué acción deseas realizar?", {
        reply_markup: {
          inline_keyboard: [
            // ...inline_keyboard_buttons, // Descomentar si se quieren botones por cita
            [
              {
                text: "✏️ Editar una cita (ingresa ID)",
                callback_data: "select_edit_appointment",
              },
              {
                text: "🗑️ Eliminar una cita (ingresa ID)",
                callback_data: "select_delete_appointment",
              },
            ],
            [
              { text: "➕ Nueva cita", callback_data: "nuevacita" },
              {
                text: "🔙 Volver al menú de citas", // O menú principal
                callback_data: "recordatorio_cita_medica",
              },
            ],
            [
              {
                text: "🏠 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al mostrar citas: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al obtener tus citas. Por favor, intenta nuevamente."
      );
    }
  }

  private async processIdForDelete(chatId: number, appointmentId: number) {
    try {
      const appointment = await this.appointmentService.getAppointmentById(
        appointmentId
      );

      if (!appointment) {
        await this.bot.sendMessage(
          chatId,
          "❌ No se encontró una cita con ese ID. Por favor, intenta nuevamente."
        );
        // Mantener el estado para que pueda reintentar o cancelar
        await this.stateService.set(chatId, {
          currentOperation: "delete_appointment",
          step: "awaiting_id_for_delete", // Permanece en este paso
        });
        return;
      }
      // Si se encuentra la cita, proceder a la confirmación
      await this.confirmarEliminarCita(chatId, appointmentId);
    } catch (error) {
      this.logger.error(
        `Error al obtener cita para eliminar: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al buscar la cita. Por favor, intenta nuevamente."
      );
      await this.stateService.set(chatId, {
        currentOperation: "delete_appointment",
        step: "awaiting_id_for_delete",
      });
    }
  }

  private async eliminarCita(chatId: number, appointmentId: number) {
    try {
      await this.appointmentService.deleteAppointment(appointmentId);
      await this.bot.sendMessage(chatId, "✅ Cita eliminada exitosamente", {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📋 Volver al menú de citas",
                callback_data: "recordatorio_cita_medica", // O el callback del menú de citas
              },
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
        `Error al eliminar cita: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        `❌ Ocurrió un error al eliminar la cita: ${error.message}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Volver al menú de citas",
                  callback_data: "recordatorio_cita_medica", // O el callback del menú de citas
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
    } finally {
      await this.stateService.delete(chatId); // Limpiar estado
    }
  }
}
