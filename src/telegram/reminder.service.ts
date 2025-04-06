import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MedicationReminder } from '../Entities/MedicationReminder.entity';
import { TelegramService } from './telegram.service';
import { SchedulerRegistry } from '@nestjs/schedule';
import * as moment from 'moment-timezone';
import { CronJob } from 'cron';
import { TelegramNotificationService } from './telegramNotificationService.service';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly soundEffects = {
    reminder: 'https://example.com/sounds/medical-alert.mp3',
    success: 'https://example.com/sounds/success.mp3',
  };

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
    private schedulerRegistry: SchedulerRegistry,
    private notificationService: TelegramNotificationService,
  ) {
    this.initializeReminders();
  }

  private async initializeReminders() {
    const activeReminders = await this.reminderRepository.find({
      where: { isActive: true },
    });
    activeReminders.forEach((reminder) => this.scheduleReminder(reminder));
  }

  private validateDaysOfWeek(daysOfWeek: number[]): boolean {
    return daysOfWeek.every((day) => day >= 0 && day <= 6);
  }

  async createReminder(
    chatId: number,
    reminderData: {
      medicationName: string;
      dosage: string;
      reminderTime: string;
      daysOfWeek: number[];
      timezone?: string;
    },
  ): Promise<MedicationReminder> {
    const {
      medicationName,
      dosage,
      reminderTime,
      daysOfWeek,
      timezone = 'America/Caracas',
    } = reminderData;

    if (!this.validateDaysOfWeek(daysOfWeek) || daysOfWeek.length === 0) {
      throw new Error('Los Días deben estar entre 0(Domingo y 6 (Sabado)');
    }

    const reminder = this.reminderRepository.create({
      chatId: chatId.toString(),
      userId: chatId.toString(),
      medicationName,
      dosage,
      reminderTime,
      daysOfWeek,
      timezone,
      createdAt: new Date(),
      isActive: true,
      type: 'medication',
    });

    const savedReminder = await this.reminderRepository.save(reminder);
    await this.scheduleReminder(savedReminder);
    return savedReminder;
  }

  private async scheduleReminder(reminder: MedicationReminder) {
    const cronExpression = this.createCronExpression(
      reminder.reminderTime,
      reminder.daysOfWeek,
    );
    const jobName = `reminder_${reminder.id}`;

    const job = new CronJob(
      cronExpression,
      () => this.sendReminderNotification(reminder),
      null,
      true,
      reminder.timezone,
    );

    if (this.schedulerRegistry.doesExist('cron', jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Recordatorio programado ${jobName} con cron: ${cronExpression}`,
    );
  }

  private createCronExpression(time: string, daysOfWeek: number[]): string {
    const [hours, minutes] = time.split(':');
    const daysExpression = daysOfWeek.join(',');
    return `${minutes} ${hours} * * ${daysExpression}`;
  }

  private async sendReminderNotification(reminder: MedicationReminder) {
    try {
      // Enviar sonido de alerta
      await this.notificationService.sendReminderNotification(reminder);
      this.logger.log(
        `Notificación enviada exitosamente para el medicamento: ${reminder.medicationName}`,
      );
    } catch (error) {
      this.logger.error(
        `Error al enviar la notificación: ${error.message}`,
        error.stack,
      );

      try {
        // Mecanismo de respaldo usando el mensaje básico
        const message = this.formatReminderMessage(reminder);
        await this.telegramService.sendMessage(
          Number(reminder.chatId),
          message,
        );
      } catch (fallbackError) {
        this.logger.error(
          `Error al enviar la notificación de respaldo: ${fallbackError.message}`,
        );
      }
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

  async confirmMedicationTaken(reminderId: number): Promise<void> {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId },
    });

    if (!reminder) {
      throw new NotFoundException('Recordatorio no encontrado');
    }

    try {
      await this.notificationService.sendReminderNotification({
        ...reminder,
        type: reminder.type === 'medication' ? 'confirmation' : 'reminder', // Esto indica que es una confirmación
      });
    } catch (error) {
      this.logger.error(`Error al enviar confirmación: ${error.message}`);

      // Intento de respaldo usando mensaje básico
      try {
        await this.telegramService.sendMessage(
          Number(reminder.chatId),
          '✅ ¡Medicamento registrado como tomado!',
        );
      } catch (fallbackError) {
        this.logger.error(
          `Error en mensaje de respaldo: ${fallbackError.message}`,
        );
      }
    }
  }

  async updateReminder(
    id: number,
    updateData: Partial<MedicationReminder>,
  ): Promise<MedicationReminder> {
    await this.reminderRepository.update(id, updateData);
    const updatedReminder = await this.reminderRepository.findOne({
      where: { id },
    });

    if (!updatedReminder) {
      throw new NotFoundException(`Recordatorio con ID ${id} no encontrado`);
    }

    if (updatedReminder.isActive) {
      await this.scheduleReminder(updatedReminder);
    } else {
      const jobName = `reminder_${id}`;
      if (this.schedulerRegistry.doesExist('cron', jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    }

    return updatedReminder;
  }

  async deleteReminder(id: number): Promise<void> {
    try {
      const reminder = await this.reminderRepository.findOne({ where: { id } });
      if (!reminder) {
        throw new NotFoundException(`Recordatorio con ID ${id} no encontrado`);
      }

      const jobName = `reminder_${id}`;

      try {
        if (this.schedulerRegistry.doesExist('cron', jobName)) {
          this.schedulerRegistry.deleteCronJob(jobName);
          this.logger.debug(
            `Trabajo programado ${jobName} eliminado exitosamente`,
          );
        }
      } catch (schedulerError) {
        this.logger.warn(
          `Error al eliminar el trabajo programado ${jobName}: ${schedulerError.message}`,
        );
      }

      await this.reminderRepository.delete(id);
      this.logger.log(`Recordatorio ${id} eliminado exitosamente`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar el recordatorio ${id}: ${error.message}`,
      );
      throw error;
    }
  }

  async getUserReminders(chatId: number): Promise<MedicationReminder[]> {
    return this.reminderRepository.find({
      where: { chatId: chatId.toString() },
      order: { createdAt: 'DESC' },
    });
  }
}
