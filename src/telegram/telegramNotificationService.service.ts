import { Injectable, Inject, Logger, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { MedicationReminder } from "../Entities/MedicationReminder.entity";
import { ReminderService } from "./reminder.service";

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);

  private readonly soundEffects = {
    reminder: "https://example.com/sounds/reminder.mp3", // Replace with actual sound URL
    alert: "https://example.com/sounds/alert.mp3", // Replace with actual sound URL
  };

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => ReminderService))
    private reminderService: ReminderService,
    // private bot: TelegramBot
    @Inject("TELEGRAM_BOT") private readonly bot: TelegramBot
  ) {
    // Inicializar efectos de sonido
    // Inicializar efectos de sonido
    this.soundEffects = {
      reminder:
        this.configService.get<string>("REMINDER_SOUND_PATH") ||
        "path/to/default/sound.mp3",
      alert:
        this.configService.get<string>("ALERT_SOUND_PATH") ||
        "path/to/default/alert.mp3",
    };

    // inicializa los callback
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleReminderCallback(callbackQuery);
    });
  }

  // async sendReminderNotification(reminder: MedicationReminder): Promise<void> {
  //   try {
  //     // Send voice message first (sound alert)
  //     await this.sendSoundAlert(Number(reminder.chatId));

  //     // Then send the reminder message with options to play sound again
  //     const messageOptions = {
  //       text: this.formatReminderMessage(reminder),
  //       parse_mode: "Markdown" as const,
  //       reply_markup: {
  //         inline_keyboard: [
  //           [
  //             // {
  //             //   text: "🔔 Reproducir sonido nuevamente",
  //             //   callback_data: "play_sound",
  //             // },
  //             {
  //               text: "✅ Tomado",
  //               callback_data: `taken_${reminder.id}`,
  //             },
  //           ],
  //           [
  //             {
  //               text: "⏰ Posponer 30 minutos",
  //               callback_data: `postpone_${reminder.id}_30`,
  //             },
  //           ],
  //         ],
  //       },
  //     };

  //     await this.bot.sendMessage(Number(reminder.chatId), messageOptions.text, {
  //       parse_mode: messageOptions.parse_mode,
  //       reply_markup: messageOptions.reply_markup,
  //     });

  //     this.logger.log(
  //       `Reminder notification sent successfully for reminder ID: ${reminder.id}`
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Error sending reminder notification: ${error.message}`,
  //       error.stack
  //     );
  //     throw error;
  //   }
  // }

  async sendReminderNotification(reminder: MedicationReminder): Promise<void> {
    try {
      // Send voice message first (sound alert)
      await this.sendSoundAlert(Number(reminder.chatId));

      // Construir el mensaje y las opciones correctamente
      const text = this.formatReminderMessage(reminder);
      const options = {
        parse_mode: "Markdown" as const,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Tomado",
                callback_data: `taken_${reminder.id}`,
              },
            ],
            [
              {
                text: "⏰ Posponer 30 minutos",
                callback_data: `postpone_${reminder.id}_30`,
              },
            ],
          ],
        },
      };

      // Enviar el mensaje con las opciones correctamente
      await this.bot.sendMessage(Number(reminder.chatId), text, options);

      this.logger.log(
        `Reminder notification sent successfully for reminder ID: ${reminder.id}`
      );
    } catch (error) {
      this.logger.error(
        `Error sending reminder notification: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  private async sendSoundAlert(chatId: number): Promise<void> {
    try {
      // Send notification sound
      await this.bot.sendVoice(chatId, this.soundEffects.reminder, {
        caption: "🔔 ¡Es hora de tu medicamento!",
      });
    } catch (error) {
      this.logger.error(`Error sending sound alert: ${error.message}`);
      // Continue with the notification even if sound fails
    }
  }

  private formatReminderMessage(reminder: MedicationReminder): string {
    return (
      `🔔 *¡Es hora de tu medicamento!*\n\n` +
      `💊 *Medicamento:* ${reminder.medicationName}\n` +
      `📊 *Dosis:* ${reminder.dosage}\n` +
      `⏰ *Hora:* ${reminder.reminderTime}\n\n` +
      `Por favor, confirma cuando hayas tomado tu medicamento.`
    );
  }

  async handleReminderCallback(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const chatId = callbackQuery.message.chat.id;

    // Responder al callback_query para evitar que el botón quede "cargando"
    await this.bot.answerCallbackQuery(callbackQuery.id);

    const [action, reminderId, ...params] = callbackQuery.data.split("_");

    try {
      switch (action) {
        case "play":
          await this.sendSoundAlert(chatId);
          break;
        case "taken":
          await this.handleMedicationTaken(chatId, Number(reminderId));
          break;
        case "postpone":
          const minutes = Number(params[0]);
          await this.handlePostponeReminder(
            chatId,
            Number(reminderId),
            minutes
          );
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error handling reminder callback: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error. Por favor, intenta nuevamente."
      );
    }
  }

  // private async handlePostponeReminder(
  //   chatId: number,
  //   reminderId: number,
  //   minutes: number
  // ): Promise<void> {
  //   try {
  //     const reminder = await this.reminderService.getReminderById(reminderId);
  //     if (!reminder) {
  //       throw new Error(`Reminder with ID ${reminderId} not found`);
  //     }

  //     const newTime = await this.reminderService.postponeReminder(
  //       reminderId,
  //       minutes
  //     );

  //     await this.bot.sendMessage(
  //       chatId,
  //       `⏰ Recordatorio pospuesto ${minutes} minutos.\n\nTe recordaré tomar ${reminder.medicationName} a las ${newTime}.`,
  //       {
  //         reply_markup: {
  //           inline_keyboard: [
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
  //     this.logger.error(`Error postponing reminder: ${error.message}`);
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Ocurrió un error. Por favor, intenta nuevamente."
  //     );
  //   }
  // }

  private async handlePostponeReminder(
    chatId: number,
    reminderId: number,
    minutes: number
  ): Promise<void> {
    try {
      const reminder = await this.reminderService.getReminderById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      const newTime = await this.reminderService.postponeReminder(
        reminderId,
        minutes
      );

      await this.bot.sendMessage(
        chatId,
        `⏰ Recordatorio pospuesto ${minutes} minutos.\n\nTe recordaré tomar ${reminder.medicationName} a las ${newTime}.`,
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
      this.logger.error(`Error postponing reminder: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error. Por favor, intenta nuevamente."
      );
    }
  }

  // private async handleMedicationTaken(
  //   chatId: number,
  //   reminderId: number
  // ): Promise<void> {
  //   try {
  //     const reminder = await this.reminderService.getReminderById(reminderId);
  //     if (!reminder) {
  //       throw new Error(`Reminder with ID ${reminderId} not found`);
  //     }

  //     await this.reminderService.logMedicationTaken(reminderId);

  //     await this.bot.sendMessage(
  //       chatId,
  //       `✅ ¡Excelente! Has tomado tu medicamento ${reminder.medicationName}.\n\nTu próximo recordatorio será a la hora programada.`,
  //       {
  //         reply_markup: {
  //           inline_keyboard: [
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
  //     this.logger.error(`Error handling medication taken: ${error.message}`);
  //     await this.bot.sendMessage(
  //       chatId,
  //       "❌ Ocurrió un error. Por favor, intenta nuevamente."
  //     );
  //   }
  // }

  private async handleMedicationTaken(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    try {
      const reminder = await this.reminderService.getReminderById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      await this.reminderService.logMedicationTaken(reminderId);

      await this.bot.sendMessage(
        chatId,
        `✅ ¡Excelente! Has tomado tu medicamento ${reminder.medicationName}.\n\nTu próximo recordatorio será a la hora programada.`,
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
      this.logger.error(`Error handling medication taken: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error. Por favor, intenta nuevamente."
      );
    }
  }

  /**
   * Envía un mensaje simple a un chat de Telegram
   * @param chatId ID del chat al que enviar el mensaje
   * @param message Texto del mensaje a enviar
   * @param parseMode Modo de parseo del mensaje (opcional)
   */
  async sendSimpleMessage(
    chatId: number,
    message: string,
    parseMode: "Markdown" | "HTML" = "Markdown"
  ): Promise<void> {
    try {
      await this.bot.sendMessage(chatId, message, {
        parse_mode: parseMode,
      });

      this.logger.log(`Mensaje simple enviado al chat ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Error enviando mensaje simple: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
