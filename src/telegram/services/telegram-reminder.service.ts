import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { ReminderService } from "../reminder.service";
// Por esta importación
import { CreateTelegramHistorialMedicoDto } from "../../telegram-historial-medico/dto/create-telegram-historial-medico.dto";
import { TelegramHistorialMedicoService } from "./telegram-historial-medico.service";

import * as PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import * as csv from "fast-csv";
import * as moment from "moment";
import "moment/locale/es";

@Injectable()
export class TelegramReminderService {
  private readonly logger = new Logger(TelegramReminderService.name);
  private userStates: Map<number, any>;

  constructor(
    @Inject("TELEGRAM_BOT") private bot: TelegramBot,
    @Inject("USER_STATES_MAP") userStatesMap: Map<number, any>,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService,
    private historialMedicoService: TelegramHistorialMedicoService
  ) {
    this.userStates = userStatesMap;
  }

  async mostrarMenuRecordatorios(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🕒 *Recordatorios de Medicamentos*\n\nPuedes programar recordatorios para tomar tus medicamentos a tiempo. Zona Horaria: Caracas ",
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
                text: " ✏ Ver ó Editar recordatorio(s) tratamiento",
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
                text: "📊 Exportar recordatorios",
                callback_data: "exportar_recordatorios",
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

      // Verificar si ya existe un recordatorio con este nombre
      try {
        const reminders = await this.reminderService.getUserReminders(chatId);
        const existingReminder = reminders.find(
          (r) =>
            r.medicationName.toLowerCase() === nombreMedicamento.toLowerCase()
        );

        if (existingReminder) {
          // Si existe, mostrar mensaje y opción de editar
          await this.bot.sendMessage(
            chatId,
            `⚠️ Ya existe un recordatorio para el medicamento "${nombreMedicamento}".\n\n¿Qué deseas hacer?`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "✏️ Editar recordatorio existente",
                      callback_data: `edit_reminder_${existingReminder.id}`,
                    },
                  ],
                  [
                    {
                      text: "➕ Crear uno nuevo de todos modos",
                      callback_data: `continue_create_${nombreMedicamento}`,
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

        // Si no existe, continuar con el flujo normal
        await this.solicitarDosis(chatId, nombreMedicamento);
      } catch (error) {
        this.logger.error(
          `Error al verificar recordatorios existentes: ${error.message}`,
          error.stack
        );
        // En caso de error, continuamos con el flujo normal
        await this.solicitarDosis(chatId, nombreMedicamento);
      }
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
            "❌ Lo siento, hubo un error al actualizar el nombre. Por favor, intenta nuevamente.",
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
        }
      });
    } catch (error) {
      this.logger.error(
        `Error al solicitar nuevo nombre: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente.",
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
            "❌ Lo siento, hubo un error al actualizar la dosis. Por favor, intenta nuevamente.",
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
            "❌ Lo siento, hubo un error al actualizar la hora. Por favor, intenta nuevamente.",
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
        }
      });
    } catch (error) {
      this.logger.error(
        `Error al solicitar nueva hora: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente.",
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

  // Método para actualizar la frecuencia
  public async actualizarFrecuencia(
    chatId: number,
    reminderId: number,
    frecuencia: string
  ): Promise<void> {
    try {
      this.logger.log(
        `Actualizando frecuencia para recordatorio ${reminderId} a ${frecuencia}`
      );

      // Si es frecuencia semanal, mostrar selector de día
      if (frecuencia === "semanal") {
        this.logger.log(
          `Frecuencia semanal seleccionada, mostrando selector de día para recordatorio ${reminderId}`
        );

        // Guardar el estado actual para referencia futura
        const userState = this.userStates.get(chatId) || { reminderData: {} };
        userState.reminderData = {
          ...userState.reminderData,
          reminderId: reminderId,
          frequency: frecuencia,
        };
        this.userStates.set(chatId, userState);

        // Obtener el recordatorio actual para tener información
        const reminder = await this.reminderService.getReminderById(reminderId);
        if (reminder) {
          // Mostrar el selector de día de la semana
          await this.mostrarSelectorDiaSemanalEdicion(chatId, reminderId);
          return;
        } else {
          await this.bot.sendMessage(
            chatId,
            "❌ No se encontró el recordatorio. Por favor, intenta nuevamente."
          );
          return;
        }
      }

      // Para otras frecuencias, actualizar directamente
      let daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]; // Por defecto todos los días

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
        "❌ Lo siento, hubo un error al actualizar la frecuencia. Por favor, intenta nuevamente.",
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
    }
  }

  // Método para mostrar el selector de día semanal para edición
  private async mostrarSelectorDiaSemanalEdicion(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    this.logger.log(
      `Mostrando selector de día para edición del recordatorio ${reminderId}`
    );

    try {
      // Crear teclado inline con los días de la semana
      const inline_keyboard = [
        [
          {
            text: "Domingo",
            callback_data: `update_day_semanal_${reminderId}_0`,
          },
          {
            text: "Lunes",
            callback_data: `update_day_semanal_${reminderId}_1`,
          },
        ],
        [
          {
            text: "Martes",
            callback_data: `update_day_semanal_${reminderId}_2`,
          },
          {
            text: "Miércoles",
            callback_data: `update_day_semanal_${reminderId}_3`,
          },
        ],
        [
          {
            text: "Jueves",
            callback_data: `update_day_semanal_${reminderId}_4`,
          },
          {
            text: "Viernes",
            callback_data: `update_day_semanal_${reminderId}_5`,
          },
        ],
        [
          {
            text: "Sábado",
            callback_data: `update_day_semanal_${reminderId}_6`,
          },
        ],
        [
          {
            text: "Cancelar",
            callback_data: `edit_reminder_${reminderId}`,
          },
        ],
      ];

      // Enviar mensaje con el selector de días
      await this.bot.sendMessage(
        chatId,
        "¿Qué día de la semana prefieres para tu recordatorio?",
        {
          reply_markup: {
            inline_keyboard,
          },
        }
      );
      this.logger.log(
        `Selector de día para edición enviado correctamente para recordatorio ${reminderId}`
      );
    } catch (error) {
      this.logger.error(
        `Error al mostrar selector de día para edición: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔙 Volver a edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
            ],
          },
        }
      );
    }
  }

  // Método para actualizar el día semanal
  public async actualizarDiaSemanal(
    chatId: number,
    reminderId: number,
    diaSemana: number,
    nombreDia: string
  ): Promise<void> {
    try {
      this.logger.log(
        `Actualizando día semanal para recordatorio ${reminderId} a ${nombreDia} (${diaSemana})`
      );

      // Crear array con solo el día seleccionado
      const daysOfWeek: number[] = [diaSemana];

      // Actualizar el recordatorio
      await this.reminderService.updateReminder(reminderId, {
        daysOfWeek: daysOfWeek,
      });

      this.logger.log(
        `Recordatorio ${reminderId} actualizado correctamente con día ${diaSemana}`
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Día de la semana actualizado a: ${nombreDia}`,
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
        `Error al actualizar día de la semana: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al actualizar el día de la semana. Por favor, intenta nuevamente.",
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
                  text: "🔙 Volver",
                  callback_data: `recordatorios`,
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
                    text: "➕ Crear nuevo recordatorio(s) Zona Horaria America/Caracas ",
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

  async solicitarDosis(
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
    // Actualizar el estado del usuario con la dosis y la hora
    const userState = this.userStates.get(chatId) || {
      step: "",
      reminderData: {},
    };
    userState.reminderData = {
      ...userState.reminderData,
      medicationName: nombreMedicamento,
      dosage: dosis,
      reminderTime: horaRecordatorio,
    };
    this.userStates.set(chatId, userState);

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
            [{ text: "Cancelar", callback_data: "menu_principal" }],
          ],
        },
      }
    );
  }

  async mostrarSelectorDiaSemanal(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string
  ): Promise<void> {
    console.log(
      `Mostrando selector de día para: ${nombreMedicamento}, hora: ${horaRecordatorio}`
    );

    // Obtener el reminderId del estado del usuario
    const userState = this.userStates.get(chatId);
    const reminderId = userState?.reminderData?.reminderId;

    try {
      let inline_keyboard;
      if (reminderId) {
        // Edición de recordatorio existente
        inline_keyboard = [
          [
            {
              text: "Domingo",
              callback_data: `update_day_semanal_${reminderId}_0`,
            },
            {
              text: "Lunes",
              callback_data: `update_day_semanal_${reminderId}_1`,
            },
          ],
          [
            {
              text: "Martes",
              callback_data: `update_day_semanal_${reminderId}_2`,
            },
            {
              text: "Miércoles",
              callback_data: `update_day_semanal_${reminderId}_3`,
            },
          ],
          [
            {
              text: "Jueves",
              callback_data: `update_day_semanal_${reminderId}_4`,
            },
            {
              text: "Viernes",
              callback_data: `update_day_semanal_${reminderId}_5`,
            },
          ],
          [
            {
              text: "Sábado",
              callback_data: `update_day_semanal_${reminderId}_6`,
            },
          ],
          [{ text: "Cancelar", callback_data: "menu_principal" }],
        ];
      } else {
        // Creación de nuevo recordatorio
        inline_keyboard = [
          [
            {
              text: "Domingo",
              callback_data: `day_semanal_0_${nombreMedicamento}_${horaRecordatorio}`,
            },
            {
              text: "Lunes",
              callback_data: `day_semanal_1_${nombreMedicamento}_${horaRecordatorio}`,
            },
          ],
          [
            {
              text: "Martes",
              callback_data: `day_semanal_2_${nombreMedicamento}_${horaRecordatorio}`,
            },
            {
              text: "Miércoles",
              callback_data: `day_semanal_3_${nombreMedicamento}_${horaRecordatorio}`,
            },
          ],
          [
            {
              text: "Jueves",
              callback_data: `day_semanal_4_${nombreMedicamento}_${horaRecordatorio}`,
            },
            {
              text: "Viernes",
              callback_data: `day_semanal_5_${nombreMedicamento}_${horaRecordatorio}`,
            },
          ],
          [
            {
              text: "Sábado",
              callback_data: `day_semanal_6_${nombreMedicamento}_${horaRecordatorio}`,
            },
          ],
          [{ text: "Cancelar", callback_data: "menu_principal" }],
        ];
      }

      await this.bot.sendMessage(
        chatId,
        "¿Qué día de la semana prefieres para tu recordatorio?",
        {
          reply_markup: {
            inline_keyboard,
          },
        }
      );
    } catch (error) {
      console.error("Error al mostrar selector de día:", error);
      this.logger.error(
        `Error al mostrar selector de día: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error. Por favor, intenta nuevamente."
      );
    }
  }

  async guardarRecordatorioSemanal(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string,
    diaSemana: number,
    nombreDia: string // Agrega este parámetro
  ): Promise<any> {
    try {
      // Crear array con solo el día seleccionado
      const daysOfWeek: number[] = [diaSemana];

      // Obtener la dosis y zona horaria del estado del usuario
      const userState = this.userStates.get(chatId);
      const dosage = userState?.reminderData?.dosage || "Dosis no especificada";
      const timezone = userState?.reminderData?.timezone || "America/Caracas";
      const reminderId = userState?.reminderData?.reminderId;

      // Actualizar el recordatorio con el nuevo día de la semana
      await this.reminderService.updateReminder(reminderId, {
        daysOfWeek: daysOfWeek,
      });

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
          `🔄 Frecuencia: Una vez por semana (${nombreDia})\n\n`, // Usar nombreDia
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: " 📋Quieres Crear el Historial Médico ?",
                  callback_data: "nuevo_historial",
                },
              ],
              [
                {
                  text: " 📄 Volver al menu recordatorios médicos",
                  callback_data: "recordatorios",
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
      return savedReminder;
    } catch (error) {
      console.error("Error al guardar recordatorio semanal:", error);
      this.logger.error(
        `Error al guardar recordatorio semanal: ${error.message}`,
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
  // pregunta si quiere guardar los datos en historial medico
  async mostrarConfirmacionGuardar(
    chatId: number,
    nombreMedicamento: string,
    dosis: string,
    savedReminder: any
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `¿Deseas guardar los datos en tu historial Medico ?\n\n` +
        `💊 Medicamento: ${nombreMedicamento}\n` +
        `📊 Dosis: ${dosis}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Si guardar",
                callback_data: `save_to_history_${savedReminder.id} `,
              },
              {
                text: "❌ No guardar",
                callback_data: `no_save_history_${savedReminder.id}`, // Incluir información necesaria
              },
            ],
          ],
        },
      }
    );
  }

  async guardarRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string,
    frecuencia: string,
    diaSemana?: number,
    nombreDia?: string
  ): Promise<any> {
    try {
      // Convertir frecuencia a días de la semana
      let daysOfWeek: number[] = [0, 1, 2, 3, 4, 5, 6]; // Por defecto todos los días

      if (frecuencia === "semanal") {
        if (diaSemana !== undefined) {
          daysOfWeek = [diaSemana];
        } else {
          daysOfWeek = [0]; // Domingo por defecto si no se especifica el día
        }
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

      let frecuenciaText = this.obtenerTextoFrecuencia(frecuencia, diaSemana);
      if (frecuencia === "semanal" && nombreDia) {
        frecuenciaText = `Una vez por semana (${nombreDia})`;
      }

      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado:\n\n` +
          `💊 Medicamento: ${nombreMedicamento}\n` +
          `📊 Dosis: ${dosage}\n` +
          `⏰ Hora: ${horaRecordatorio}\n` +
          `🔄 Frecuencia: ${frecuenciaText}\n\n`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: " 📋Quieres Crear el Historial Médico ?",
                  callback_data: "nuevo_historial",
                },
              ],
              [
                {
                  text: " 📄 Volver al menu recordatorios médicos",
                  callback_data: "recordatorios",
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
      return savedReminder;
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

  private obtenerTextoFrecuencia(
    frecuencia: string,
    diaSemana?: number
  ): string {
    switch (frecuencia) {
      case "diaria":
        return "Todos los días";
      case "8h":
        return "Cada 8 horas";
      case "12h":
        return "Cada 12 horas";
      case "semanal":
        if (diaSemana !== undefined) {
          const dayNames = [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado",
          ];
          return `Una vez por semana (${dayNames[diaSemana]})`;
        }
        return "Una vez por semana";
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
      const userState = this.userStates.get(chatId) || {
        step: "",
        reminderData: {},
      };
      userState.reminderData = {
        ...userState.reminderData,
        reminderId: reminderId,
        currentReminder: reminder,
      };
      this.userStates.set(chatId, userState);

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

      // Guardar el recordatorio en el estado del usuario para usarlo después
      this.userStates.set(chatId, {
        ...state,
        savedReminder: reminder,
      });

      // Preguntar si desea guardar en historial médico
      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado exitosamente:\n\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `📊 Dosis: ${reminder.dosage}\n` +
          `⏰ Hora: ${reminder.reminderTime}\n` +
          `📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}\n\n` +
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
      this.userStates.delete(chatId);
    }
  }

  // nuevo metodo formato exportacion
  async mostrarOpcionesExportacion(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📊 *Exportación de Recordatorios* 📊\n\n" +
        "Puedes exportar tus recordatorios de medicación para compartirlos con tu médico o guardarlos para tu registro personal.\n\n" +
        "¿En qué formato deseas exportar tus recordatorios?",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 CSV (Excel)",
                callback_data: "exportar_recordatorios_csv",
              },
              {
                text: "📕 PDF",
                callback_data: "exportar_recordatorios_pdf",
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
  }

  async exportarRecordatorios(
    chatId: number,
    formato: "csv" | "pdf"
  ): Promise<void> {
    const reminders = await this.reminderService.getUserReminders(chatId);

    if (!reminders || reminders.length === 0) {
      await this.bot.sendMessage(
        chatId,
        "No tienes recordatorios para exportar.",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Menú de Recordatorios",
                  callback_data: "recordatorios",
                },
              ],
              [
                {
                  text: "🔙 Volver al Menú Principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          },
        }
      );
      return;
    }

    if (formato === "csv") {
      // Generar CSV simple en memoria
      const csvRows = [
        "Medicamento,Dosis,Hora,Días",
        ...reminders.map(
          (r) =>
            `"${r.medicationName}","${r.dosage}","${
              r.reminderTime
            }","${this.formatDaysOfWeek(r.daysOfWeek)}"`
        ),
      ];
      const csvContent = csvRows.join("\n");
      await this.bot.sendDocument(
        chatId,
        Buffer.from(csvContent),
        {},
        { filename: "recordatorios.csv", contentType: "text/csv" }
      );
      // Agregar botón para compartir con el médico
      await this.bot.sendMessage(
        chatId,
        "¿Deseas compartir tus recordatorios con tu médico?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Compartir con mi médico",
                  callback_data: `compartir_recordatorios_${formato}`,
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

    if (formato === "pdf") {
      // Generar PDF simple en memoria
      const PDFDocument = require("pdfkit");
      const doc = new PDFDocument();
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", async () => {
        const pdfBuffer = Buffer.concat(chunks);
        await this.bot.sendDocument(
          chatId,
          pdfBuffer,
          {},
          {
            filename: "Recordatorios tratamientos médicos.pdf",
            contentType: "application/pdf",
          }
        );

        // Añadir botones después de enviar el documento PDF
        await this.bot.sendMessage(
          chatId,
          "✅ Tus recordatorios han sido generador en formato PDF.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📋 Menú de Recordatorios",
                    callback_data: "recordatorios",
                  },
                ],
                [
                  {
                    text: "🔙 Volver al Menú Principal",
                    callback_data: "menu_principal",
                  },
                ],
              ],
            },
          }
        );
      });
      doc.fontSize(16).text("Tus Recordatorios", { align: "center" });
      // Título
      const chat = await this.bot.getChat(chatId);
      const nombreUsuario = chat.first_name
        ? `${chat.first_name} ${chat.last_name || ""}`.trim()
        : chat.username
        ? chat.username
        : "No especificado";

      doc.fontSize(12).text(`Paciente: ${nombreUsuario}`);
      doc.fontSize(12).text(`ID: ${chatId}`);
      doc.moveDown();
      doc.fontSize(14).text("Información del Paciente:", { underline: true });
      doc.fontSize(12).text(`Nombre: ${nombreUsuario}`);
      doc.fontSize(12).text(`ID: ${chatId}`);
      doc.moveDown();

      doc.fontSize(14).text("Resumen de Medicamentos:", { underline: true });
      doc.moveDown();

      // Tabla de resumen
      const medicamentos = reminders.map((r) => r.medicationName);
      const medicamentosUnicos = [...new Set(medicamentos)];
      doc
        .fontSize(12)
        .text(`Total de medicamentos: ${medicamentosUnicos.length}`);
      doc.fontSize(12).text(`Total de recordatorios: ${reminders.length}`);
      doc.moveDown(2);

      // Contenido detallado
      doc.fontSize(14).text("Detalle de Recordatorios:", { underline: true });
      doc.moveDown();

      reminders.forEach((reminder, index) => {
        doc.fontSize(13).text(`${index + 1}. ${reminder.medicationName}`, {
          continued: true,
        });
        doc.fontSize(11).text(` (ID: ${reminder.id})`, { align: "right" });

        doc.fontSize(12).text(`Dosis: ${reminder.dosage}`);
        doc.fontSize(12).text(`Hora: ${reminder.reminderTime}`);

        // Formatear días de la semana
        const diasSemana = this.formatDaysOfWeek(reminder.daysOfWeek);
        doc.fontSize(12).text(`Días: ${diasSemana}`);

        if (reminder.lastTaken) {
          doc
            .fontSize(12)
            .text(
              `Última toma: ${moment(reminder.lastTaken).format(
                "DD/MM/YYYY HH:mm"
              )}`
            );
        }

        // Añadir una línea separadora entre recordatorios
        if (index < reminders.length - 1) {
          doc.moveDown(0.5);
          doc
            .strokeColor("#cccccc")
            .lineWidth(1)
            .moveTo(50, doc.y)
            .lineTo(550, doc.y)
            .stroke();
        }

        doc.moveDown();
      });

      // Añadir pie de página
      doc
        .fontSize(10)
        .text("Este documento fue generado automáticamente por @Medicbot.", {
          align: "center",
          bottom: 30,
        });

      //--------------------
      doc.moveDown();
      reminders.forEach((r, i) => {
        doc
          .fontSize(12)
          .text(
            `#${i + 1}\nMedicamento: ${r.medicationName}\nDosis: ${
              r.dosage
            }\nHora: ${r.reminderTime}\nDías: ${this.formatDaysOfWeek(
              r.daysOfWeek
            )}\n`
          );
        doc.moveDown();
      });
      doc.end();
      return;
    }

    //
  }

  async solicitarContactoMedico(
    chatId: number,
    formato: string
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Por favor, comparte el contacto de tu médico o escribe su número de teléfono para enviarle tus recordatorios.",
      {
        reply_markup: {
          keyboard: [
            [{ text: "Compartir contacto", request_contact: true }],
            [{ text: "Cancelar" }],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      }
    );

    // Esperar la respuesta del usuario (contacto o texto)
    this.bot.once("contact", async (msg) => {
      if (msg.chat.id !== chatId) return;
      const telefono = msg.contact?.phone_number;
      await this.bot.sendMessage(
        chatId,
        `Contacto recibido: ${telefono}\nEnviando recordatorios...`
      );
      await this.exportarRecordatorios(chatId, formato as "csv" | "pdf");
      await this.bot.sendMessage(
        chatId,
        "✅ Tus recordatorios han sido preparados. Si tu médico usa Telegram y ya interactuó con este bot, podrá recibirlos aquí. Si no, reenvía el archivo manualmente por WhatsApp, correo, etc."
      );
    });

    this.bot.once("message", async (msg) => {
      if (msg.chat.id !== chatId) return;
      if (msg.text === "Cancelar") {
        await this.bot.sendMessage(chatId, "Operación cancelada.");
        return;
      }
      // Si el usuario escribe un número de teléfono
      if (/^\+?\d{7,15}$/.test(msg.text || "")) {
        await this.bot.sendMessage(
          chatId,
          `Número recibido: ${msg.text}\nEnviando recordatorios...`
        );
        await this.exportarRecordatorios(chatId, formato as "csv" | "pdf");
        await this.bot.sendMessage(
          chatId,
          "✅ Tus recordatorios han sido preparados. Si tu médico usa Telegram y ya interactuó con este bot, podrá recibirlos aquí. Si no, reenvía el archivo manualmente por WhatsApp, correo, etc."
        );
      } else if (!msg.contact) {
        await this.bot.sendMessage(
          chatId,
          "Por favor, comparte un contacto válido o escribe un número de teléfono."
        );
      }
    });
  }
} // fin
