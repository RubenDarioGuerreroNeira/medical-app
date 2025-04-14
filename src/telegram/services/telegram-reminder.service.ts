import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { ReminderService } from "../reminder.service";

@Injectable()
export class TelegramReminderService {
  private readonly logger = new Logger(TelegramReminderService.name);
  private userStates: Map<number, any>;

  constructor(
    @Inject("TELEGRAM_BOT") private bot: TelegramBot,
    @Inject("USER_STATES_MAP") userStatesMap: Map<number, any>,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService
  ) {
    this.userStates = userStatesMap;
    this.setupCallbacks();

    // Verificar que reminderService tiene el método createReminder
    if (
      !this.reminderService ||
      typeof this.reminderService.createReminder !== "function"
    ) {
      this.logger.error(
        "ReminderService no tiene el método createReminder o no está correctamente inyectado"
      );
    } else {
      this.logger.log("ReminderService correctamente inyectado");
    }
    // Verificar qué tipo de objeto es reminderService
    this.logger.log(`ReminderService type: ${typeof this.reminderService}`);
    this.logger.log(
      `ReminderService constructor: ${this.reminderService.constructor.name}`
    );
  }

  // private setupCallbacks(): void {
  //   this.bot.on("callback_query", async (query) => {
  //     const chatId = query.message.chat.id;
  //     const data = query.data;

  //     if (data === "crear_recordatorio" || data === "create_reminder") {
  //       await this.iniciarCreacionRecordatorio(chatId);
  //     } else if (data === "ver_recordatorios" || data === "list_reminders") {
  //       await this.mostrarRecordatorios(chatId);
  //     } else if (data.startsWith("freq_")) {
  //       const [freq, nombreMedicamento, horaRecordatorio] = data
  //         .split("_")
  //         .slice(1);
  //       await this.guardarRecordatorio(
  //         chatId,
  //         nombreMedicamento,
  //         horaRecordatorio,
  //         freq
  //       );
  //     } else if (data.startsWith("delete_reminder_")) {
  //       const reminderId = Number(data.split("_")[2]);
  //       await this.eliminarRecordatorio(chatId, reminderId);
  //     } else if (data === "confirm_days") {
  //       await this.finalizarCreacionRecordatorio(chatId);
  //     }
  //   });
  // }

  private setupCallbacks(): void {
    this.bot.on("callback_query", async (query) => {
      const chatId = query.message.chat.id;
      const data = query.data;

      if (data === "crear_recordatorio" || data === "create_reminder") {
        await this.iniciarCreacionRecordatorio(chatId);
      } else if (data === "ver_recordatorios" || data === "list_reminders") {
        await this.mostrarRecordatorios(chatId);
      } else if (
        data === "eliminar_recordatorio" ||
        data === "delete_reminder"
      ) {
        await this.mostrarEliminarRecordatorio(chatId);
      } else if (data.startsWith("freq_")) {
        const [freq, nombreMedicamento, horaRecordatorio] = data
          .split("_")
          .slice(1);
        await this.guardarRecordatorio(
          chatId,
          nombreMedicamento,
          horaRecordatorio,
          freq
        );
      } else if (data.startsWith("delete_reminder_")) {
        const reminderId = Number(data.split("_")[2]);
        await this.eliminarRecordatorio(chatId, reminderId);
      } else if (data === "confirm_days") {
        await this.finalizarCreacionRecordatorio(chatId);
      }
    });
  }

  async mostrarMenuRecordatorios(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🕒 *Recordatorios de Medicamentos*\n\nPuedes programar recordatorios para tomar tus medicamentos a tiempo.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➕ Crear nuevo recordatorio",
                callback_data: "crear_recordatorio",
              },
            ],
            [
              {
                text: "📋 Ver mis recordatorios",
                callback_data: "ver_recordatorios",
              },
            ],
            [
              {
                text: "🗑 Elimina  recordatorio",
                callback_data: "eliminar_recordatorio",
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

  async iniciarCreacionRecordatorio(chatId: number): Promise<void> {
    this.userStates.set(chatId, {
      step: "medication_name",
      reminderData: {},
    });

    const message = await this.bot.sendMessage(
      chatId,
      "Por favor, ingresa el nombre del medicamento:",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;

      const nombreMedicamento = msg.text;
      await this.solicitarDosis(chatId, nombreMedicamento);
    });
  }

  // async mostrarRecordatorios(chatId: number): Promise<void> {
  //   try {
  //     const reminders = await this.reminderService.getUserReminders(chatId);

  //     if (!reminders || reminders.length === 0) {
  //       await this.bot.sendMessage(
  //         chatId,
  //         "📋 *Tus Recordatorios*\n\n" +
  //           "No tienes recordatorios configurados actualmente.",
  //         {
  //           parse_mode: "Markdown",
  //           reply_markup: {
  //             inline_keyboard: [
  //               [
  //                 {
  //                   text: "➕ Crear nuevo recordatorio",
  //                   callback_data: "crear_recordatorio",
  //                 },
  //               ],
  //               [
  //                 {
  //                   text: "🔙 Volver al menú principal",
  //                   callback_data: "menu_principal",
  //                 },
  //               ],
  //             ],
  //           },
  //         }
  //       );
  //       return;
  //     }

  //     // Construir mensaje con los recordatorios
  //     let message = "📋 *Tus Recordatorios*\n\n";
  //     reminders.forEach((reminder, index) => {
  //       message += `*${index + 1}.* ${reminder.medicationName}\n`;
  //       message += `   📊 Dosis: ${reminder.dosage}\n`;
  //       message += `   ⏰ Hora: ${reminder.reminderTime}\n`;
  //       message += `   📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}\n\n`;
  //     });

  //     await this.bot.sendMessage(chatId, message, {
  //       parse_mode: "Markdown",
  //       reply_markup: {
  //         inline_keyboard: [
  //           [
  //             {
  //               text: "➕ Crear nuevo recordatorio",
  //               callback_data: "crear_recordatorio",
  //             },
  //           ],
  //           [
  //             {
  //               text: "🗑️ Eliminar recordatorio",
  //               callback_data: "eliminar_recordatorio",
  //             },
  //           ],
  //           [
  //             {
  //               text: "🔙 Volver al menú principal",
  //               callback_data: "menu_principal",
  //             },
  //           ],
  //         ],
  //       },
  //     });
  //   } catch (error) {
  //     this.logger.error(
  //       `Error al mostrar recordatorios: ${error.message}`,
  //       error.stack
  //     );
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Lo siento, hubo un error al cargar tus recordatorios. Por favor, intenta nuevamente."
  //     );
  //   }
  // }

  private async solicitarDosis(
    chatId: number,
    nombreMedicamento: string
  ): Promise<void> {
    const message = await this.bot.sendMessage(
      chatId,
      `¿Cuál es la dosis de ${nombreMedicamento}?`,
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;

      const dosis = msg.text;
      await this.solicitarHoraRecordatorio(chatId, nombreMedicamento, dosis);
    });
  }

  private async solicitarHoraRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    dosis: string
  ): Promise<void> {
    const message = await this.bot.sendMessage(
      chatId,
      `¿A qué hora debes tomar ${nombreMedicamento}? (Formato: HH:MM AM/PM, ejemplos: 08:30 AM, 02:45 PM)`,
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;

      const horaRecordatorio = msg.text;

      // Validar formato de hora con AM/PM
      if (
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)$/i.test(
          horaRecordatorio
        )
      ) {
        await this.bot.sendMessage(
          chatId,
          "Formato de hora incorrecto. Por favor, usa el formato HH:MM AM/PM (ejemplos: 08:30 AM, 02:45 PM)."
        );
        await this.solicitarHoraRecordatorio(chatId, nombreMedicamento, dosis);
        return;
      }

      await this.solicitarFrecuenciaRecordatorio(
        chatId,
        nombreMedicamento,
        dosis,
        horaRecordatorio
      );
    });
  }

  private async solicitarFrecuenciaRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    dosis: string,
    horaRecordatorio: string
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "¿Con qué frecuencia debes tomar este medicamento?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Diariamente",
                callback_data: `freq_diaria_${nombreMedicamento}_${horaRecordatorio}`,
              },
            ],
            [
              {
                text: "Cada 8 horas",
                callback_data: `freq_8h_${nombreMedicamento}_${horaRecordatorio}`,
              },
            ],
            [
              {
                text: "Cada 12 horas",
                callback_data: `freq_12h_${nombreMedicamento}_${horaRecordatorio}`,
              },
            ],
            [
              {
                text: "Una vez por semana",
                callback_data: `freq_semanal_${nombreMedicamento}_${horaRecordatorio}`,
              },
            ],
            [{ text: "Cancelar", callback_data: "cancelar_recordatorio" }],
          ],
        },
      }
    );
  }

  async guardarRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string,
    frecuencia: string
  ): Promise<void> {
    try {
      // Convertir frecuencia a días de la semana
      let daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]; // Por defecto todos los días

      if (frecuencia === "semanal") {
        daysOfWeek = [0]; // Domingo
      }

      // Obtener la dosis del estado del usuario
      const userState = this.userStates.get(chatId);
      const dosage = userState?.reminderData?.dosage || "Dosis no especificada";

      const savedReminder = await this.reminderService.createReminder(chatId, {
        medicationName: nombreMedicamento,
        dosage: dosage,
        reminderTime: horaRecordatorio,
        daysOfWeek: daysOfWeek,
        timezone: "America/Caracas",
      });

      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado:\n\n` +
          `💊 Medicamento: ${nombreMedicamento}\n` +
          `📊 Dosis: ${dosage}\n` +
          `⏰ Hora: ${horaRecordatorio}\n` +
          `🔄 Frecuencia: ${this.obtenerTextoFrecuencia(frecuencia)}\n\n` +
          `Te enviaré un recordatorio según la configuración establecida.`,
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
    } catch (error) {
      console.error("Error al guardar recordatorio:", error);
      this.logger.error(
        `Error al guardar recordatorio: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al guardar tu recordatorio. Por favor, intenta nuevamente."
      );
    }
  }

  // Agregar este método si no existe
  private obtenerTextoFrecuencia(frecuencia: string): string {
    switch (frecuencia) {
      case "diaria":
        return "Todos los días";
      case "8h":
        return "Cada 8 horas";
      case "12h":
        return "Cada 12 horas";
      case "semanal":
        return "Una vez por semana (Domingo)";
      default:
        return frecuencia;
    }
  }

  async mostrarRecordatorios(chatId: number): Promise<void> {
    try {
      const reminders = await this.reminderService.getUserReminders(chatId);

      if (!reminders || reminders.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📋 *Tus Recordatorios*\n\n" +
            "No tienes recordatorios configurados actualmente.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "➕ Crear nuevo recordatorio",
                    callback_data: "crear_recordatorio",
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
        return;
      }

      // Formatear la lista de recordatorios
      const remindersList = reminders
        .map(
          (reminder, index) => `
📌 Recordatorio ${index + 1}:
💊 Medicamento: ${reminder.medicationName}
📊 Dosis: ${reminder.dosage}
⏰ Hora: ${reminder.reminderTime}
📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}
🆔 ID: ${reminder.id}
`
        )
        .join("\n");

      await this.bot.sendMessage(
        chatId,
        `📋 *Tus Recordatorios*\n${remindersList}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➕ Crear nuevo recordatorio",
                  callback_data: "crear_recordatorio",
                },
              ],
              [
                {
                  text: "❌ Eliminar recordatorio",
                  callback_data: "mostrar_eliminar_recordatorio",
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
    } catch (error) {
      this.logger.error(
        `Error al mostrar recordatorios: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al obtener tus recordatorios. Por favor, intenta nuevamente."
      );
    }
  }

  private formatDaysOfWeek(daysOfWeek: number[]): string {
    if (!daysOfWeek || daysOfWeek.length === 0) {
      return "No especificado";
    }

    if (daysOfWeek.length === 7) {
      return "Todos los días";
    }

    const dayNames = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return daysOfWeek.map((day) => dayNames[day]).join(", ");
  }

  // async mostrarEliminarRecordatorio(chatId: number): Promise<void> {
  //   try {
  //     const reminders = await this.reminderService.getUserReminders(chatId);

  //     if (!reminders || reminders.length === 0) {
  //       await this.bot.sendMessage(
  //         chatId,
  //         "No tienes recordatorios para eliminar.",
  //         {
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
  //         }
  //       );
  //       return;
  //     }

  //     const inlineKeyboard = reminders.map((reminder) => [
  //       {
  //         text: `${reminder.medicationName} - ${reminder.reminderTime}`,
  //         callback_data: `delete_reminder_${reminder.id}`,
  //       },
  //     ]);

  //     inlineKeyboard.push([
  //       {
  //         text: "🔙 Cancelar",
  //         callback_data: "ver_recordatorios",
  //       },
  //     ]);

  //     await this.bot.sendMessage(
  //       chatId,
  //       "Selecciona el recordatorio que deseas eliminar:",
  //       {
  //         reply_markup: {
  //           inline_keyboard: inlineKeyboard,
  //         },
  //       }
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Error al mostrar eliminar recordatorio: ${error.message}`,
  //       error.stack
  //     );
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Lo siento, hubo un error al obtener tus recordatorios. Por favor, intenta nuevamente."
  //     );
  //   }
  // }

  //----------------------
  async mostrarEliminarRecordatorio(chatId: number): Promise<void> {
    try {
      const reminders = await this.reminderService.getUserReminders(chatId);

      if (!reminders || reminders.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📋 *No tienes recordatorios*\n\nNo hay recordatorios configurados para eliminar.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "➕ Crear nuevo recordatorio",
                    callback_data: "crear_recordatorio",
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
        return;
      }

      // Crear teclado con los recordatorios existentes
      const inlineKeyboard = reminders.map((reminder) => [
        {
          text: `🗑️ ${reminder.medicationName} - ${reminder.reminderTime}`,
          callback_data: `delete_reminder_${reminder.id}`,
        },
      ]);

      // Agregar botón para volver
      inlineKeyboard.push([
        {
          text: "🔙 Cancelar",
          callback_data: "ver_recordatorios",
        },
      ]);

      await this.bot.sendMessage(
        chatId,
        "📋 *Eliminar Recordatorio*\n\nSelecciona el recordatorio que deseas eliminar:",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: inlineKeyboard,
          },
        }
      );
    } catch (error) {
      this.logger.error(
        `Error al mostrar recordatorios para eliminar: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al cargar tus recordatorios. Por favor, intenta nuevamente."
      );
    }
  }

  async eliminarRecordatorio(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    try {
      // Obtener el recordatorio antes de eliminarlo para mostrar sus detalles
      const reminder = await this.reminderService.getReminderById(reminderId);

      if (!reminder) {
        await this.bot.sendMessage(
          chatId,
          "❌ El recordatorio que intentas eliminar no existe o ya fue eliminado.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📋 Ver mis recordatorios",
                    callback_data: "ver_recordatorios",
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
        return;
      }

      // Eliminar el recordatorio
      await this.reminderService.deleteReminder(reminderId);

      // Mensaje de confirmación con detalles del recordatorio eliminado
      await this.bot.sendMessage(
        chatId,
        `✅ *Recordatorio eliminado correctamente*\n\n` +
          `Se ha eliminado el recordatorio:\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `⏰ Hora: ${reminder.reminderTime}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Ver mis recordatorios",
                  callback_data: "ver_recordatorios",
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
    } catch (error) {
      this.logger.error(
        `Error al eliminar recordatorio: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al eliminar el recordatorio. Por favor, intenta nuevamente.",
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

  //----------------------

  // async eliminarRecordatorio(
  //   chatId: number,
  //   reminderId: number
  // ): Promise<void> {
  //   try {
  //     await this.reminderService.deleteReminder(reminderId);

  //     await this.bot.sendMessage(
  //       chatId,
  //       "✅ Recordatorio eliminado correctamente.",
  //       {
  //         reply_markup: {
  //           inline_keyboard: [
  //             [
  //               {
  //                 text: "📋 Ver mis recordatorios",
  //                 callback_data: "ver_recordatorios",
  //               },
  //             ],
  //             [
  //               {
  //                 text: "🔙 Volver al menú principal",
  //                 callback_data: "menu_principal",
  //               },
  //             ],
  //           ],
  //         },
  //       }
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Error al eliminar recordatorio: ${error.message}`,
  //       error.stack
  //     );
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Lo siento, hubo un error al eliminar el recordatorio. Por favor, intenta nuevamente."
  //     );
  //   }
  // }

  async finalizarCreacionRecordatorio(chatId: number): Promise<void> {
    const state = this.userStates.get(chatId);
    if (!state || !state.reminderData) {
      await this.bot.sendMessage(
        chatId,
        "❌ Ha ocurrido un error. Por favor, inicia nuevamente la creación del recordatorio."
      );
      return;
    }

    try {
      const reminder = await this.reminderService.createReminder(
        chatId,
        state.reminderData
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado exitosamente:\n\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `📊 Dosis: ${reminder.dosage}\n` +
          `⏰ Hora: ${reminder.reminderTime}\n` +
          `📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}`,
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
    } catch (error) {
      this.logger.error(
        `Error al finalizar creación: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Error al crear el recordatorio. Por favor, intenta nuevamente."
      );
    } finally {
      this.userStates.delete(chatId);
    }
  }
}
