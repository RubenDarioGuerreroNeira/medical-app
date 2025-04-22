// prueba
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
    // this.setupCallbacks();

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
                text: "➕ Crear nuevo recordatorio(s) tratamiento",
                callback_data: "crear_recordatorio",
              },
            ],
            [
              {
                text: "📋 ✏ Ver ó Editar recordatorio(s) tratamiento",
                callback_data: "ver_recordatorios",
              },
            ],

            [
              {
                text: "🗑 Elimina  recordatorio(s) tratamiento",
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

  // Método para solicitar el nuevo nombre del medicamento
  public async solicitarNuevoNombre(chatId: number): Promise<void> {
    try {
      const state = this.userStates.get(chatId);

      if (
        !state ||
        !state.reminderData ||
        !state.reminderData.currentReminder
      ) {
        await this.bot.sendMessage(
          chatId,
          "❌ Ha ocurrido un error. Por favor, intenta nuevamente.",
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
        return;
      }

      const reminder = state.reminderData.currentReminder;
      const reminderId = state.reminderData.reminderId;

      const message = await this.bot.sendMessage(
        chatId,
        `Nombre actual: ${reminder.medicationName}\n\nPor favor, ingresa el nuevo nombre del medicamento:`,
        {
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        }
      );

      this.userStates.set(chatId, {
        ...state,
        step: "waiting_new_name",
      });

      this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
        if (!msg.text) return;

        try {
          // Actualizar el recordatorio con el nuevo nombre
          await this.reminderService.updateReminder(reminderId, {
            medicationName: msg.text,
          });

          await this.bot.sendMessage(
            chatId,
            `✅ Nombre del medicamento actualizado a: ${msg.text}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔙 Volver a edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al menú de recordatorios",
                      callback_data: "recordatorios",
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          this.logger.error(
            `Error al actualizar nombre: ${error.message}`,
            error.stack
          );
          await this.bot.sendMessage(
            chatId,
            "❌ Lo siento, hubo un error al actualizar el nombre. Por favor, intenta nuevamente."
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `Error al solicitar nuevo nombre: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente."
      );
    }
  }

  // Método para solicitar la nueva dosis
  public async solicitarNuevaDosis(chatId: number): Promise<void> {
    try {
      const state = this.userStates.get(chatId);
      if (
        !state ||
        !state.reminderData ||
        !state.reminderData.currentReminder
      ) {
        await this.bot.sendMessage(
          chatId,
          "❌ Ha ocurrido un error. Por favor, intenta nuevamente."
        );
        return;
      }

      const reminder = state.reminderData.currentReminder;
      const reminderId = state.reminderData.reminderId;

      const message = await this.bot.sendMessage(
        chatId,
        `Dosis actual: ${reminder.dosage}\n\nPor favor, ingresa la nueva dosis del medicamento:`,
        {
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        }
      );

      this.userStates.set(chatId, {
        ...state,
        step: "waiting_new_dosage",
      });

      this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
        if (!msg.text) return;

        try {
          // Actualizar el recordatorio
          await this.reminderService.updateReminder(reminderId, {
            medicationName: msg.text,
          });

          await this.bot.sendMessage(
            chatId,
            `✅ Dosis actualizada a: ${msg.text}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔙 Volver a edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al menú de recordatorios",
                      callback_data: "recordatorios",
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          this.logger.error(
            `Error al actualizar dosis: ${error.message}`,
            error.stack
          );
          await this.bot.sendMessage(
            chatId,
            "❌ Lo siento, hubo un error al actualizar la dosis. Por favor, intenta nuevamente."
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `Error al solicitar nueva dosis: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente."
      );
    }
  }

  // Método para solicitar la nueva hora
  public async solicitarNuevaHora(chatId: number): Promise<void> {
    try {
      const state = this.userStates.get(chatId);
      if (
        !state ||
        !state.reminderData ||
        !state.reminderData.currentReminder
      ) {
        await this.bot.sendMessage(
          chatId,
          "❌ Ha ocurrido un error. Por favor, intenta nuevamente."
        );
        return;
      }

      const reminder = state.reminderData.currentReminder;
      const reminderId = state.reminderData.reminderId;

      const message = await this.bot.sendMessage(
        chatId,
        `Hora actual: ${reminder.reminderTime}\n\nPor favor, ingresa la nueva hora (Formato: HH:MM AM/PM, ejemplos: 08:30 AM, 02:45 PM):`,
        {
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        }
      );

      this.userStates.set(chatId, {
        ...state,
        step: "waiting_new_time",
      });

      this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
        if (!msg.text) return;

        // Validar formato de hora con AM/PM
        if (
          !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)$/i.test(msg.text)
        ) {
          await this.bot.sendMessage(
            chatId,
            "Formato de hora incorrecto. Por favor, usa el formato HH:MM AM/PM (ejemplos: 08:30 AM, 02:45 PM)."
          );
          await this.solicitarNuevaHora(chatId);
          return;
        }

        try {
          // Actualizar el recordatorio
          await this.reminderService.updateReminder(reminderId, {
            reminderTime: msg.text,
          });

          await this.bot.sendMessage(
            chatId,
            `✅ Hora actualizada a: ${msg.text}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔙 Volver a edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al menú de recordatorios",
                      callback_data: "recordatorios",
                    },
                  ],
                ],
              },
            }
          );
        } catch (error) {
          this.logger.error(
            `Error al actualizar hora: ${error.message}`,
            error.stack
          );
          await this.bot.sendMessage(
            chatId,
            "❌ Lo siento, hubo un error al actualizar la hora. Por favor, intenta nuevamente."
          );
        }
      });
    } catch (error) {
      this.logger.error(
        `Error al solicitar nueva hora: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente."
      );
    }
  }

  public async actualizarFrecuencia(
    chatId: number,
    reminderId: number,
    frecuencia: string
  ): Promise<void> {
    try {
      // Convertir frecuencia a días de la semana
      let daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]; // Por defecto todos los días

      if (frecuencia === "semanal") {
        daysOfWeek = [0]; // Domingo
      }

      // Actualizar el recordatorio
      await this.reminderService.updateReminder(reminderId, {
        daysOfWeek: daysOfWeek,
      });

      await this.bot.sendMessage(
        chatId,
        `✅ Frecuencia actualizada a: ${this.obtenerTextoFrecuencia(
          frecuencia
        )}`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔙 Volver a edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
              [
                {
                  text: "🔙 Volver al menú de recordatorios",
                  callback_data: "recordatorios",
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(
        `Error al actualizar frecuencia: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al actualizar la frecuencia. Por favor, intenta nuevamente."
      );
    }
  }

  // Método para solicitar la nueva frecuencia
  public async solicitarNuevaFrecuencia(chatId: number): Promise<void> {
    try {
      const state = this.userStates.get(chatId);
      if (
        !state ||
        !state.reminderData ||
        !state.reminderData.currentReminder
      ) {
        await this.bot.sendMessage(
          chatId,
          "❌ Ha ocurrido un error. Por favor, intenta nuevamente."
        );
        return;
      }

      const reminderId = state.reminderData.reminderId;

      await this.bot.sendMessage(
        chatId,
        "Por favor, selecciona la nueva frecuencia para este medicamento:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Diariamente",
                  callback_data: `update_freq_${reminderId}_diaria`,
                },
              ],
              [
                {
                  text: "Cada 8 horas",
                  callback_data: `update_freq_${reminderId}_8h`,
                },
              ],
              [
                {
                  text: "Cada 12 horas",
                  callback_data: `update_freq_${reminderId}_12h`,
                },
              ],
              [
                {
                  text: "Una vez por semana",
                  callback_data: `update_freq_${reminderId}_semanal`,
                },
              ],
              [
                {
                  text: "🔙 Cancelar",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(
        `Error al solicitar nueva frecuencia: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente."
      );
    }
  }

  public async mostrarEditarRecordatorio(chatId: number): Promise<void> {
    try {
      const reminders = await this.reminderService.getUserReminders(chatId);

      if (!reminders || reminders.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📋 *Editar Recordatorios*\n\n" +
            "No tienes recordatorios configurados para editar.",
          {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "➕ Crear nuevo recordatorio(s)",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "🔙 Volver al menú de recordatorios",
                    callback_data: "recordatorios",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      // Construir mensaje con los recordatorios
      let message =
        "📋 *Estos son tus recordatorios médicos, si quieres editar alguno presionalo:*\n\n";

      // Crear teclado inline con los recordatorios
      const inlineKeyboard = reminders.map((reminder, index) => {
        return [
          {
            text: `${index + 1}. ${reminder.medicationName} - ${
              reminder.reminderTime
            }`,
            callback_data: `edit_reminder_${reminder.id}`,
          },
        ];
      });

      // Agregar botón para volver
      inlineKeyboard.push([
        {
          text: "🔙 Volver al menú de recordatorios",
          callback_data: "recordatorios",
        },
      ]);

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al mostrar recordatorios para editar: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al cargar tus recordatorios. Por favor, intenta nuevamente."
      );
    }
  }

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

  // private async solicitarHoraRecordatorio(
  //   chatId: number,
  //   nombreMedicamento: string,
  //   dosis: string
  // ): Promise<void> {
  //   const message = await this.bot.sendMessage(
  //     chatId,
  //     `¿A qué hora debes tomar ${nombreMedicamento}? (Formato: HH:MM AM/PM, ejemplos: 08:30 AM, 02:45 PM)`,
  //     {
  //       reply_markup: {
  //         force_reply: true,
  //         selective: true,
  //       },
  //     }
  //   );

  //   this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
  //     if (!msg.text) return;

  //     const horaRecordatorio = msg.text;

  //     // Validar formato de hora con AM/PM
  //     if (
  //       !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)$/i.test(
  //         horaRecordatorio
  //       )
  //     ) {
  //       await this.bot.sendMessage(
  //         chatId,
  //         "Formato de hora incorrecto. Por favor, usa el formato HH:MM AM/PM (ejemplos: 08:30 AM, 02:45 PM)."
  //       );
  //       await this.solicitarHoraRecordatorio(chatId, nombreMedicamento, dosis);
  //       return;
  //     }

  //     await this.solicitarFrecuenciaRecordatorio(
  //       chatId,
  //       nombreMedicamento,
  //       dosis,
  //       horaRecordatorio
  //     );
  //   });
  // }

  // uso zona horaria local o le pregunto al usuario cual usar
  private async solicitarHoraRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    dosis: string
  ): Promise<void> {
    // Obtener o detectar la zona horaria del usuario
    const userTimezone =
      (await this.detectUserTimezone(chatId)) || "America/Caracas";

    // Guardar la zona horaria en el estado del usuario
    const userState = this.userStates.get(chatId) || {
      step: "",
      reminderData: {},
    };
    userState.reminderData = {
      ...userState.reminderData,
      medicationName: nombreMedicamento,
      dosage: dosis,
      timezone: userTimezone,
    };
    this.userStates.set(chatId, userState);

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

      // Validar formato de hora con AM/PM
      if (
        !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]\s?(AM|PM|am|pm)$/i.test(msg.text)
      ) {
        await this.bot.sendMessage(
          chatId,
          "Formato de hora incorrecto. Por favor, usa el formato HH:MM AM/PM (ejemplos: 08:30 AM, 02:45 PM)."
        );
        await this.solicitarHoraRecordatorio(chatId, nombreMedicamento, dosis);
        return;
      }

      const horaRecordatorio = msg.text;

      // Actualizar el estado del usuario con la hora
      const state = this.userStates.get(chatId);
      if (state) {
        state.reminderData.reminderTime = horaRecordatorio;
        this.userStates.set(chatId, state);
      }

      // Continuar con la solicitud de frecuencia
      await this.solicitarFrecuenciaRecordatorio(
        chatId,
        nombreMedicamento,
        dosis,
        horaRecordatorio
      );
    });
  }

  // Método para detectar la zona horaria del usuario
  private async detectUserTimezone(chatId: number): Promise<string | null> {
    try {
      // Aquí podrías implementar lógica para:
      // 1. Verificar si el usuario ya tiene una zona horaria guardada
      // 2. Detectar la zona horaria basada en la ubicación del usuario (si está disponible)
      // 3. Preguntar al usuario su ubicación o zona horaria

      // Por ahora, devolvemos null para usar el valor predeterminado
      return null;
    } catch (error) {
      this.logger.error(`Error al detectar zona horaria: ${error.message}`);
      return null;
    }
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

  // async guardarRecordatorio(
  //   chatId: number,
  //   nombreMedicamento: string,
  //   horaRecordatorio: string,
  //   frecuencia: string
  // ): Promise<void> {
  //   try {
  //     // Convertir frecuencia a días de la semana
  //     let daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]; // Por defecto todos los días

  //     if (frecuencia === "semanal") {
  //       daysOfWeek = [0]; // Domingo
  //     }

  //     // Obtener la dosis del estado del usuario
  //     const userState = this.userStates.get(chatId);
  //     const dosage = userState?.reminderData?.dosage || "Dosis no especificada";

  //     const savedReminder = await this.reminderService.createReminder(chatId, {
  //       medicationName: nombreMedicamento,
  //       dosage: dosage,
  //       reminderTime: horaRecordatorio,
  //       daysOfWeek: daysOfWeek,
  //       timezone: "America/Caracas",
  //     });

  //     await this.bot.sendMessage(
  //       chatId,
  //       `✅ Recordatorio configurado:\n\n` +
  //         `💊 Medicamento: ${nombreMedicamento}\n` +
  //         `📊 Dosis: ${dosage}\n` +
  //         `⏰ Hora: ${horaRecordatorio}\n` +
  //         `🔄 Frecuencia: ${this.obtenerTextoFrecuencia(frecuencia)}\n\n` +
  //         `Te enviaré un recordatorio según la configuración establecida.`,
  //       {
  //         reply_markup: {
  //           inline_keyboard: [
  //             [
  //               {
  //                 text: "🔙 Volver al menú principal",
  //                 callback_data: "menu_principal",
  //               },
  //               {
  //                 text: " Volver al menu recordatorios médicos",
  //                 callback_data: "recordatorios",
  //               },
  //             ],
  //           ],
  //         },
  //       }
  //     );
  //   } catch (error) {
  //     console.error("Error al guardar recordatorio:", error);
  //     this.logger.error(
  //       `Error al guardar recordatorio: ${error.message}`,
  //       error.stack
  //     );
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Lo siento, hubo un error al guardar tu recordatorio. Por favor, intenta nuevamente.",
  //       {
  //         reply_markup: {
  //           inline_keyboard: [
  //             [
  //               {
  //                 text: "🔙 Volver al menú principal",
  //                 callback_data: "menu_principal",
  //               },
  //               {
  //                 text: " Volver al menu recordatorios médicos",
  //                 callback_data: "recordatorios",
  //               },
  //             ],
  //           ],
  //         },
  //       }
  //     );
  //   }
  // }

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

      // Obtener la dosis y zona horaria del estado del usuario
      const userState = this.userStates.get(chatId);
      const dosage = userState?.reminderData?.dosage || "Dosis no especificada";
      const timezone = userState?.reminderData?.timezone || "America/Caracas"; // Usar Bogotá como predeterminado para Colombia

      const savedReminder = await this.reminderService.createReminder(chatId, {
        medicationName: nombreMedicamento,
        dosage: dosage,
        reminderTime: horaRecordatorio,
        daysOfWeek: daysOfWeek,
        timezone: timezone,
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
                {
                  text: " Volver al menu recordatorios médicos",
                  callback_data: "recordatorios",
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
        "❌ Lo siento, hubo un error al guardar tu recordatorio. Por favor, intenta nuevamente.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
                },
                {
                  text: " Volver al menu recordatorios médicos",
                  callback_data: "recordatorios",
                },
              ],
            ],
          },
        }
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
                    text: "➕ Crear nuevo recordatorio(s)",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "🗑 Eliminar recordatorio(s)",
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
                  text: "➕ Crear nuevo recordatorio(s)",
                  callback_data: "crear_recordatorio",
                },
              ],
              [
                {
                  text: "❌ Eliminar recordatorio(s)",
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

  // ediocn de recordatorios
  public async iniciarEdicionRecordatorio(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    try {
      // Obtener el recordatorio específico
      const reminder = await this.reminderService.getReminderById(reminderId);

      if (!reminder) {
        await this.bot.sendMessage(
          chatId,
          "❌ No se encontró el recordatorio seleccionado. Por favor, intenta nuevamente."
        );
        return;
      }

      // Guardar el ID del recordatorio en el estado del usuario
      this.userStates.set(chatId, {
        step: "edit_medication_name",
        reminderData: {
          reminderId: reminderId,
          currentReminder: reminder,
        },
      });

      // Mostrar opciones de edición
      await this.bot.sendMessage(
        chatId,
        `*Editando recordatorio:* ${reminder.medicationName}\n\n` +
          "¿Qué deseas modificar?",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Nombre del medicamento", callback_data: "edit_name" }],
              [{ text: "Dosis", callback_data: "edit_dosage" }],
              [{ text: "Hora", callback_data: "edit_time" }],
              [{ text: "Frecuencia", callback_data: "edit_frequency" }],
              [
                {
                  text: "🔙 Volver al menu principal",
                  callback_data: "recordatorios",
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(
        `Error al iniciar edición de recordatorio: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al iniciar la edición. Por favor, intenta nuevamente."
      );
    }
  }

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
                    text: "➕ Crear recordatorio(s) tratamiiento",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "✏ Editar recordatorio(s) tratamiiento",
                    callback_data: "editar_recordatorio_medico",
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
                    text: "✏ Editar recordatorio(s) tratamiento",
                    callback_data: "editar_recordatorio_medico",
                  },
                ],

                [
                  {
                    text: "📋 Ver mis recordatorio(s)",
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
                  text: "📋 Ver mis recordatorio(s)",
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
        "❌ Error al crear el recordatorio. Por favor, intenta nuevamente.",
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
    } finally {
      this.userStates.delete(chatId);
    }
  }
}
