import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { ReminderService } from "../reminder.service";
// Por esta importación
import { CreateTelegramHistorialMedicoDto } from "../../telegram-historial-medico/dto/create-telegram-historial-medico.dto";
import { TelegramHistorialMedicoService } from "./telegram-historial-medico.service";
import { TelegramMenuService } from "./telegram-menu.service";
import * as PDFDocument from "pdfkit";
import * as fs from "fs";
import * as path from "path";
import * as csv from "fast-csv";
import * as moment from "moment";
import "moment/locale/es";
import { TelegramStateService } from "./telegram-state.service";

@Injectable()
export class TelegramReminderService {
  private readonly logger = new Logger(TelegramReminderService.name);

  constructor(
    @Inject("TELEGRAM_BOT") private bot: TelegramBot,
    private readonly stateService: TelegramStateService,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService,
    private historialMedicoService: TelegramHistorialMedicoService,
    private menusService: TelegramMenuService
  ) {}

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
                text: "➕ Crear Recordatorio(s) tratamiento",
                callback_data: "crear_recordatorio",
              },
            ],
            [
              {
                text: " ✏ Ver ó Editar Recordatorio(s)",
                callback_data: "ver_recordatorios",
              },
            ],
            [
              {
                text: "🗑 Elimina Recordatorio(s)",
                callback_data: "eliminar_recordatorio",
              },
            ],
            [
              {
                text: "📊 Estadísticas de Medicamentos",
                callback_data: "estadisticas_medicamentos",
              },
            ],
            [
              {
                text: "📲 Exportar recordatorios",
                callback_data: "exportar_recordatorios",
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
  }

  async handleMarkAsTaken(
    chatId: number,
    reminderId: number,
    originalMessageId: number
  ): Promise<void> {
    try {
      const reminder = await this.reminderService.markMedicationAsTaken(
        reminderId
      );

      //
      // 1. Enviar mensaje de confirmación

      await this.bot.sendMessage(
        chatId,
        // `✅ "${reminder.medicationName}" marcado como tomado.`

        // Opcional: Podrías intentar editar el mensaje original de la notificación para quitar los botones.
        `✅ "${this.escapeMarkdown(
          reminder.medicationName
        )}" marcado como tomado.`
        // Considera usar { parse_mode: "MarkdownV2" } si escapeMarkdown está ajustado para ello
      );
      // 2. Editar el mensaje original para quitar los botones (si se proporciona el ID)
      if (originalMessageId) {
        try {
          await this.bot.editMessageReplyMarkup(
            { inline_keyboard: [] }, // Teclado vacío para remover los botones
            { chat_id: chatId, message_id: originalMessageId }
          );
        } catch (editError) {
          this.logger.warn(
            `[${chatId}] No se pudo editar el mensaje original del recordatorio ${reminderId}: ${
              (editError as Error).message
            }`
          );
          // No es crítico, continuar.
        }
      }

      // 3. Esperar 3 segundos
      const delayInMilliseconds = 3000;
      await new Promise((resolve) => setTimeout(resolve, delayInMilliseconds));

      // 4. Redirigir al menú principal
      this.logger.log(
        `[${chatId}] Redirigiendo al menú principal después de marcar medicamento como tomado.`
      );
      await this.menusService.mostrarMenuPrincipal(chatId);
    } catch (error) {
      this.logger.error(
        // `Error al marcar como tomado (chatId: ${chatId}, reminderId: ${reminderId}): ${error.message}`,
        // error.stack
        `Error al marcar como tomado (chatId: ${chatId}, reminderId: ${reminderId}): ${
          (error as Error).message
        }`,
        (error as Error).stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Error al marcar el medicamento como tomado."
      );
    }
  }

  async mostrarEstadisticasMedicamentos(chatId: number): Promise<void> {
    try {
      const statsSemana = await this.reminderService.getMedicationStats(
        chatId,
        "week"
      );

      if (statsSemana.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "No hay datos de medicamentos tomados en la última semana para mostrar estadísticas.\n\n" +
            "Asegúrate de marcar tus medicamentos como 'tomados' cuando recibas los recordatorios.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔙 Volver al menú Recordatorios",
                    callback_data: "recordatorios",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      let message = "📊 *Estadísticas  Medicamentos (Últimos 7 días):*\n\n";
      statsSemana.forEach((stat) => {
        message += `💊 ${this.escapeMarkdown(stat.medicationName)}: Tomado ${
          stat.takenCount
        } veces\n`;
      });

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            // Podrías añadir botones para ver estadísticas mensuales o de otros periodos
            // [{ text: "Ver estadísticas del último mes", callback_data: "stats_month" }],
            [
              {
                text: "🔙 Volver Menú Recordatorios",
                callback_data: "recordatorios",
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al mostrar estadísticas (chatId: ${chatId}): ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Error al cargar las estadísticas de medicamentos."
      );
    }
  }

  protected escapeMarkdown(text: string): string {
    if (!text) return "";
    // Escapa caracteres especiales de Markdown V2
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
  }

  async iniciarCreacionRecordatorio(chatId: number): Promise<void> {
    await this.stateService.set(chatId, {
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
                      text: "✏️ Editar Recordatorio Existente",
                      callback_data: `edit_reminder_${existingReminder.id}`,
                    },
                  ],
                  [
                    {
                      text: "➕ Crear uno Nuevo",
                      callback_data: `continue_create_${nombreMedicamento}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
                      callback_data: "recordatorios",
                    },
                  ],
                ],
              },
            }
          );
          return;
        }

        const currentState = await this.stateService.get(chatId);
        if (currentState) {
          currentState.reminderData.medicationName = nombreMedicamento;
          await this.stateService.set(chatId, currentState);
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
      const state = await this.stateService.get(chatId);

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

      await this.stateService.set(chatId, {
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
                      text: "🔙 Volver a Edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
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
                      text: "🔙 Volver a Edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
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
                  text: "🔙 Volver al Menú Principal",
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
      const state = await this.stateService.get(chatId);
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

      await this.stateService.set(chatId, {
        ...state,
        step: "waiting_new_dosage",
      });

      this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
        if (!msg.text) return;

        try {
          // Actualizar Dosis
          await this.reminderService.updateReminder(reminderId, {
            dosage: msg.text,
          });

          await this.bot.sendMessage(
            chatId,
            `✅ Dosis actualizada a: ${msg.text}`,
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔙 Volver a Edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
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
                      text: "🔙 Volver a Edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
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
      const state = await this.stateService.get(chatId);
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

      await this.stateService.set(chatId, {
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
                      text: "🔙 Volver al menú Recordatorios",
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
                      text: "🔙 Volver a Edición",
                      callback_data: `edit_reminder_${reminderId}`,
                    },
                  ],
                  [
                    {
                      text: "🔙 Volver al Menú Recordatorios",
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
                  text: "🔙 Volver al Menú Principal",
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
        const userState = await this.stateService.get(chatId) || { reminderData: {} };
        userState.reminderData = {
          ...userState.reminderData,
          reminderId: reminderId,
          frequency: frecuencia,
        };
        await this.stateService.set(chatId, userState);

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
                  text: "✏ Volver a Edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
              [
                {
                  text: "🔙 Volver al Menú Recordatorios",
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
                  text: "🔙 Volver a Edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
              [
                {
                  text: "🔙 Volver al Menú Recordatorios",
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
                  text: "🔙 Volver a Edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
              [
                {
                  text: "🔙 Volver al Menú Recordatorios",
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
                  text: "🔙 Volver a Edición",
                  callback_data: `edit_reminder_${reminderId}`,
                },
              ],
              [
                {
                  text: "🔙 Volver al Menú Recordatorios",
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
      const state = await this.stateService.get(chatId);
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
                    text: "➕ Crear Recordatorio-(Zona Horaria America/Caracas)",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "🔙 Volver al Menú Recordatorios",
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
      inlineKeyboard.push(
        [
          {
            text: " ✔ Crear Recordatorio(s)",
            callback_data: "recordatorios",
          },
        ],

        [
          {
            text: " ❌ Eliminar Recordatorio(s)",
            callback_data: "eliminar_recordatorio",
          },
        ],

        [
          {
            text: "🔙 Menú Principal",
            callback_data: "menu_principal",
          },
        ]
      );

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

      // Guardar la dosis en el estado del usuario
      const currentState = await this.stateService.get(chatId);
      if (!currentState || !currentState.reminderData) {
        this.logger.error(
          `[${chatId}] Estado de usuario no encontrado o reminderData ausente al procesar dosis.`
        );
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error. Por favor, intenta crear el recordatorio de nuevo."
        );
        await this.stateService.delete(chatId);
        return;
      }
      currentState.reminderData.dosage = dosis;
      await this.stateService.set(chatId, currentState);

      await this.solicitarHoraRecordatorio(chatId, nombreMedicamento, dosis);
    });
  }

  // Se Solicitara la Zona horaria Explicitamente
  private async solicitarHoraRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    // _nombreMedicamento: string,
    dosis: string
  ): Promise<void> {
    // Obtener o detectar la zona horaria del usuario
    const userTimezone =
      (await this.detectUserTimezone(chatId)) || "America/Caracas";

    const userState = await this.stateService.get(chatId);
    if (!userState || !userState.reminderData) {
      this.logger.error(
        `[${chatId}] Estado de usuario no encontrado o reminderData ausente en solicitarHoraRecordatorio`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error, por favor intenta crear el recordatorio de nuevo."
      );
      await this.stateService.delete(chatId);
      return;
    }
    // El nombre del medicamento ya debe estar en userState.reminderData.medicationName
    userState.reminderData.dosage = dosis;
    // La timezone se pedirá después de la hora.
    await this.stateService.set(chatId, userState);

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
        // Re-solicitar la hora usando los datos originales
        const originalState = await this.stateService.get(chatId);
        if (originalState && originalState.reminderData) {
          await this.solicitarHoraRecordatorio(
            chatId,
            originalState.reminderData.medicationName,
            originalState.reminderData.dosage
          );
        } else {
          await this.bot.sendMessage(
            chatId,
            "❌ Error al reintentar. Por favor, comienza de nuevo."
          );
          await this.stateService.delete(chatId);
        }
        return;
      }

      const horaRecordatorio = msg.text;

      const currentState = await this.stateService.get(chatId);
      if (currentState && currentState.reminderData) {
        currentState.reminderData.reminderTime = horaRecordatorio;
        currentState.step = "awaiting_timezone"; // Nuevo paso
        await this.stateService.set(chatId, currentState);
        await this.solicitarZonaHoraria(chatId); // Llamar al nuevo método
      } else {
        this.logger.error(
          `[${chatId}] Estado de usuario no encontrado al procesar hora.`
        );
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error. Por favor, intenta crear el recordatorio de nuevo."
        );
        await this.stateService.delete(chatId);
      }
    });
  }

  private async solicitarZonaHoraria(chatId: number): Promise<void> {
    const message = await this.bot.sendMessage(
      chatId,
      "🌍 Por favor, ingresa tu zona horaria.\n\n" +
        "Puedes escribir el nombre de una ciudad principal como:\n" +
        "• `Caracas`\n" +
        "• `Bogota`\n" +
        "• `Brasilia`\n" +
        "• `Santiago`\n" +
        "• `Buenos Aires`\n" +
        "• `Madrid`\n\n" +
        "O ingresa la zona horaria completa (ej: `America/New_York`).\n" +
        "Si tu zona horaria no está en la lista, puedes escribirla directamente o consultar la lista completa en:\n" +
        "https://en.wikipedia.org/wiki/List_of_tz_database_time_zones",

      {
        // parse_mode: "Markdown",
        reply_markup: {
          force_reply: true,
          selective: true,
          inline_keyboard: [
            [
              { text: "Caracas", callback_data: "tz_America/Caracas" },
              { text: "Bogotá", callback_data: "tz_America/Bogota" },
            ],
            [
              { text: "Brasilia", callback_data: "tz_America/Sao_Paulo" }, // Sao_Paulo es una zona común para Brasil
              { text: "Santiago", callback_data: "tz_America/Santiago" },
            ],
            [
              {
                text: "Buenos Aires",
                callback_data: "tz_America/Argentina/Buenos_Aires",
              },
              { text: "Madrid", callback_data: "tz_Europe/Madrid" },
            ],
            // Puedes añadir una fila para "Otra (escribir)" si quieres ser más explícito
            // [
            //   { text: "Otra (escribir)", callback_data: "tz_type_other" } // Este callback no haría nada, solo es visual
            // ]
          ],
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;
      const userState = await this.stateService.get(chatId);
      if (!userState || !userState.reminderData) {
        this.logger.error(
          `[${chatId}] Estado de usuario no encontrado al procesar zona horaria.`
        );
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error. Por favor, intenta crear el recordatorio de nuevo."
        );
        await this.stateService.delete(chatId);
        return;
      }

      if (moment.tz.zone(msg.text)) {
        // Validar si la zona horaria es válida
        userState.reminderData.timezone = msg.text;
        await this.stateService.set(chatId, userState);
        await this.solicitarFrecuenciaRecordatorio(
          chatId,
          userState.reminderData.medicationName,
          userState.reminderData.dosage,
          userState.reminderData.reminderTime
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ Zona horaria inválida. Intenta de nuevo."
        );
        await this.solicitarZonaHoraria(chatId); // Re-prompt
      }
      const userInput = msg.text.trim().toLowerCase();
      let timezoneToSave: string | null = null;

      // Mapa de ciudades comunes a zonas horarias TZ
      const commonTimezoneMap: { [key: string]: string } = {
        caracas: "America/Caracas",
        bogota: "America/Bogota",
        bogotá: "America/Bogota",
        brasilia: "America/Sao_Paulo", // O America/Brasilia si es más preciso para el caso de uso
        santiago: "America/Santiago",
        "buenos aires": "America/Argentina/Buenos_Aires",
        madrid: "Europe/Madrid",
        // Puedes añadir más ciudades comunes aquí
      };

      if (commonTimezoneMap[userInput]) {
        timezoneToSave = commonTimezoneMap[userInput];
      } else if (moment.tz.zone(msg.text.trim())) {
        // Intenta validar la entrada del usuario tal cual
        timezoneToSave = msg.text;
      } else if (moment.tz.zone(msg.text)) {
        // intenta validar la entrada del usuario
        timezoneToSave = msg.text;
      }

      if (timezoneToSave) {
        userState.reminderData.timezone = timezoneToSave;
        await this.stateService.set(chatId, userState);
        await this.solicitarFrecuenciaRecordatorio(
          chatId,
          userState.reminderData.medicationName,
          userState.reminderData.dosage,
          userState.reminderData.reminderTime
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ Zona horaria inválida. Intenta de nuevo con una ciudad de la lista o el formato completo (ej: America/New_York)."
        );
        await this.solicitarZonaHoraria(chatId); // Re-prompt
      }
    });
  }

  // Método para detectar la zona horaria del usuario
  private async detectUserTimezone(chatId: number): Promise<string | null> {
    try {
      //implementar lógica para:
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

  async solicitarFrecuenciaRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    dosis: string,
    horaRecordatorio: string
  ): Promise<void> {
    const userState = await this.stateService.get(chatId);
    if (!userState || !userState.reminderData) {
      this.logger.error(
        `[${chatId}] Estado de usuario no encontrado al solicitar frecuencia.`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error. Por favor, intenta crear el recordatorio de nuevo."
      );
      await this.stateService.delete(chatId);
      return;
    }
    // medicationName, dosage, reminderTime y timezone ya deberian estar en userState.reminderData
    userState.step = "awaiting_frequency";
    await this.stateService.set(chatId, userState);

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
    const userState = await this.stateService.get(chatId);
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
    nombreDia: string
  ): Promise<any> {
    try {
      // Crear array con solo el día seleccionado
      const daysOfWeek: number[] = [diaSemana];

      // Obtener la dosis y zona horaria del estado del usuario
      const userState = await this.stateService.get(chatId);
      const dosage = userState?.reminderData?.dosage || "Dosis no especificada";
      // const timezone = userState?.reminderData?.timezone || "America/Caracas";
      const timezone = userState?.reminderData?.timezone || "America/Caracas"; // Ahora debería ser el valor por defecto
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
          // `🔄 Frecuencia: Una vez por semana (${nombreDia})\n\n`, // Usar nombreDia
          `🔄 Frecuencia: Una vez por semana (${nombreDia})\n` +
          `🌍 Zona Horaria: ${timezone}\n\n`,
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "⭐ ¡IMPORTANTE! Configura tu QR de Emergencia",
                  callback_data: "configurar_emergencia",
                },
              ],
              [
                {
                  text: " 📋Quieres Crear el Historial Médico ?",
                  callback_data: "nuevo_historial",
                },
              ],
              [
                {
                  text: " 📄 Volver al Menu Recordatorios Médicos",
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
                  text: "🔙 Volver al Menú Principal",
                  callback_data: "menu_principal",
                },
                {
                  text: " Volver Menu Recordatorios Médicos",
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
                text: "✅ Si Guardar",
                callback_data: `save_to_history_${savedReminder.id} `,
              },
              {
                text: "❌ No Guardar",
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
      const userState = await this.stateService.get(chatId);
      const dosage = userState?.reminderData?.dosage || "Dosis no especificada";
      // const timezone = userState?.reminderData?.timezone || "America/Caracas"; // Usar Bogotá como predeterminado para Colombia
      const timezone = userState?.reminderData?.timezone || "America/Caracas"; // Ahora debería venir del estado del usuario

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
          // `🔄 Frecuencia: ${frecuenciaText}\n\n`,
          `🔄 Frecuencia: ${frecuenciaText}\n` +
          `🌍 Zona Horaria: ${timezone}\n\n`,
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
                  text: " 📄 Volver al Menu Recordatorios Médicos",
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
                  text: "🔙 Volver al Menú Principal",
                  callback_data: "menu_principal",
                },
                {
                  text: " Volver al Menu Recordatorios Médicos",
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
                    text: "➕ Crear Nuevo Recordatorio(s)",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "🗑 Eliminar Recordatorio(s)",
                    callback_data: "eliminar_recordatorio",
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
                  text: "➕ Crear Nuevo Recordatorio",
                  callback_data: "crear_recordatorio",
                },
              ],
              [
                {
                  text: "❌ Eliminar Recordatorio",
                  callback_data: "eliminar_recordatorio",
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
      const userState = await this.stateService.get(chatId) || {
        step: "",
        reminderData: {},
      };
      userState.reminderData = {
        ...userState.reminderData,
        reminderId: reminderId,
        currentReminder: reminder,
      };
      await this.stateService.set(chatId, userState);

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
                  text: "🔙 Volver al Menu Principal",
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
                    text: "➕ Crear Recordatorio Tratamiento",
                    callback_data: "crear_recordatorio",
                  },
                ],
                [
                  {
                    text: "✏ Editar Recordatorio(s) Tratamiiento",
                    callback_data: "editar_recordatorio_medico",
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

      // Crear teclado con los recordatorios existentes
      const inlineKeyboard = reminders.map((reminder) => [
        {
          text: ` ${reminder.medicationName} - ${reminder.reminderTime}`,
          callback_data: `delete_reminder_${reminder.id}`,
        },
      ]);

      // Agregar botón para volver
      inlineKeyboard.push([
        {
          text: "🔙 Volver Menu Recordatorios",
          callback_data: "recordatorios",
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
                    text: "✏ Editar Recordatorio Tratamiento",
                    callback_data: "editar_recordatorio_medico",
                  },
                ],

                [
                  {
                    text: "📋 Ver  Recordatorio(s)",
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
        `✅ *Recordatorio Eliminado Correctamente*\n\n` +
          `Se ha eliminado el recordatorio:\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `⏰ Hora: ${reminder.reminderTime}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📋 Ver ó Editar Recordatorio(s)",
                  callback_data: "ver_recordatorios",
                },
              ],
              [
                {
                  text: " ❌ Eliminar otro(s) Recordatorio",
                  callback_data: "eliminar_recordatorio",
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
                  text: "🔙 Volver al Menú Principal",
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
    const state = await this.stateService.get(chatId);
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
      await this.stateService.set(chatId, {
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
                    text: "⭐ ¡IMPORTANTE! Configura tu QR de Emergencia",
                    callback_data: "configurar_emergencia",
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
                  text: "🔙 Volver al Menú Principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          },
        }
      );
      await this.stateService.delete(chatId);
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
                text: "🔙 Volver al Menú Recordatorios",
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
                  text: "📋 Crear Recordatorio",
                  callback_data: "crear_recordatorio",
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
            [{ text: "Compartir Contacto", request_contact: true }],
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
