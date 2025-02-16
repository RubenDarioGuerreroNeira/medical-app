import { Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { MedicationReminder } from "../entities/reminder.entity";

@Injectable()
export class TelegramNotificationService {
  private readonly logger = new Logger(TelegramNotificationService.name);
  private readonly soundEffects = {
    reminder: "https://example.com/sounds/reminder.mp3", // Replace with actual sound URL
    alert: "https://example.com/sounds/alert.mp3", // Replace with actual sound URL
  };

  constructor(
    private configService: ConfigService,
    // private bot: TelegramBot
    @Inject("TELEGRAM_BOT") private readonly bot: TelegramBot
  ) {}

  async sendReminderNotification(reminder: MedicationReminder): Promise<void> {
    try {
      // Send voice message first (sound alert)
      await this.sendSoundAlert(Number(reminder.chatId));

      // Then send the reminder message with options to play sound again
      const messageOptions = {
        text: this.formatReminderMessage(reminder),
        parse_mode: "Markdown" as const,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔔 Reproducir sonido nuevamente",
                callback_data: "play_sound",
              },
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

      await this.bot.sendMessage(Number(reminder.chatId), messageOptions.text, {
        parse_mode: messageOptions.parse_mode,
        reply_markup: messageOptions.reply_markup,
      });

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

  private async handleMedicationTaken(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "✅ ¡Excelente! Has confirmado que tomaste tu medicamento."
    );
  }

  private async handlePostponeReminder(
    chatId: number,
    reminderId: number,
    minutes: number
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `⏰ Recordatorio pospuesto ${minutes} minutos. Te notificaré nuevamente.`
    );
  }
}
