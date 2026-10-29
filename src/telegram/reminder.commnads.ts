import { Injectable } from '@nestjs/common';
import { ReminderService } from './reminder.service';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class ReminderCommands {
  constructor(private reminderService: ReminderService) {}

  async handleSetReminder(
    msg: TelegramBot.Message,
    bot: TelegramBot,
  ): Promise<void> {
    const chatId = msg.chat.id;

    await bot.sendMessage(
      chatId,
      'Vamos a configurar un recordatorio para tu medicamento. 💊\n\nPor favor, escribe el nombre del medicamento:',
    );

    bot.once('message', async (nameMsg) => {
      const medicationName = nameMsg.text;

      await bot.sendMessage(chatId, '¿Cuál es la dosis?');

      bot.once('message', async (doseMsg) => {
        const dosage = doseMsg.text;

        await bot.sendMessage(
          chatId,
          '¿A qué hora quieres recibir el recordatorio? (Formato 24h, ejemplo: 14:30)',
        );

        bot.once('message', async (timeMsg) => {
          const reminderTime = timeMsg.text;

          try {
            // Corregimos la llamada al método createReminder
            await this.reminderService.createReminder(chatId, {
              medicationName,
              dosage,
              reminderTime,
              daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Todos los días por defecto
              timezone: 'America/Caracas', // Timezone por defecto
            });

            await bot.sendMessage(
              chatId,
              `✅ Recordatorio configurado con éxito:\n\n` +
                `💊 Medicamento: ${medicationName}\n` +
                `📊 Dosis: ${dosage}\n` +
                `⏰ Hora: ${reminderTime}\n\n` +
                `Te notificaré todos los días a esa hora.`,
            );
          } catch (error) {
            await bot.sendMessage(
              chatId,
              '❌ Lo siento, hubo un error al configurar el recordatorio. Por favor, intenta nuevamente.',
            );
          }
        });
      });
    });
  }

  async handleListReminders(
    msg: TelegramBot.Message,
    bot: TelegramBot,
  ): Promise<void> {
    const chatId = msg.chat.id;
    const userId = msg.from.id;

    const reminders = await this.reminderService.getUserReminders(userId);

    if (reminders.length === 0) {
      await bot.sendMessage(
        chatId,
        'No tienes recordatorios configurados actualmente.',
      );
      return;
    }

    let message = '📋 Tus recordatorios activos:\n\n';
    reminders.forEach((reminder, index) => {
      message +=
        `${index + 1}. ${reminder.medicationName}\n` +
        `   📊 Dosis: ${reminder.dosage}\n` +
        `   ⏰ Hora: ${reminder.reminderTime}\n\n`;
    });

    await bot.sendMessage(chatId, message);
  }
}
