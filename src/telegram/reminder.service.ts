import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicationReminder } from "../entities/reminder.entity";
import { TelegramService } from "./telegram.service";
import { SchedulerRegistry } from "@nestjs/schedule";
import * as moment from "moment-timezone";
import { CronJob } from "cron";

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
    private schedulerRegistry: SchedulerRegistry
  ) {
    this.initializeReminders();
  }

  private async initializeReminders() {
    const activeReminders = await this.reminderRepository.find({
      where: { isActive: true },
    });
    activeReminders.forEach((reminder) => this.scheduleReminder(reminder));
  }

  async createReminder(
    chatId: number,
    reminderData: {
      medicationName: string;
      dosage: string;
      reminderTime: string;
      daysOfWeek?: number[];
      timezone?: string;
    }
  ): Promise<MedicationReminder> {
    const {
      medicationName,
      dosage,
      reminderTime,
      daysOfWeek = [0, 1, 2, 3, 4, 5, 6],
      timezone = "America/Lima",
    } = reminderData;

    const reminder = this.reminderRepository.create({
      chatId: chatId.toString(), // Convert to string for DB storage
      userId: chatId.toString(),
      medicationName,
      dosage,
      reminderTime,
      daysOfWeek,
      timezone,
      createdAt: new Date(),
      isActive: true,
    });

    const savedReminder = await this.reminderRepository.save(reminder);
    await this.scheduleReminder(savedReminder);
    return savedReminder;
  }

  private async scheduleReminder(reminder: MedicationReminder) {
    const cronExpression = this.createCronExpression(
      reminder.reminderTime,
      reminder.daysOfWeek
    );
    const jobName = `reminder_${reminder.id}`;

    const job = new CronJob(
      cronExpression,
      () => this.sendReminderNotification(reminder),
      null,
      true,
      reminder.timezone
    );

    if (this.schedulerRegistry.doesExist("cron", jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Scheduled reminder ${jobName} with cron: ${cronExpression}`
    );
  }

  private createCronExpression(time: string, daysOfWeek: number[]): string {
    const [hours, minutes] = time.split(":");
    const daysExpression = daysOfWeek.join(",");
    return `${minutes} ${hours} * * ${daysExpression}`;
  }

  private async sendReminderNotification(reminder: MedicationReminder) {
    const message =
      `🔔 Recordatorio de medicación:\n\n` +
      `💊 Medicamento: ${reminder.medicationName}\n` +
      `📊 Dosis: ${reminder.dosage}\n` +
      `⏰ Hora: ${reminder.reminderTime}`;

    await this.telegramService.sendMessage(Number(reminder.chatId), message);
  }

  async updateReminder(
    id: number,
    updateData: Partial<MedicationReminder>
  ): Promise<MedicationReminder> {
    await this.reminderRepository.update(id, updateData);
    const updatedReminder = await this.reminderRepository.findOne({
      where: { id },
    });

    if (updatedReminder && updatedReminder.isActive) {
      await this.scheduleReminder(updatedReminder);
    } else if (updatedReminder && !updatedReminder.isActive) {
      const jobName = `reminder_${id}`;
      if (this.schedulerRegistry.doesExist("cron", jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    }

    return updatedReminder;
  }

  async deleteReminder(id: number): Promise<void> {
    try {
      // Primero verificamos si el recordatorio existe
      const reminder = await this.reminderRepository.findOne({ where: { id } });
      if (!reminder) {
        throw new NotFoundException(`Recordatorio con ID ${id} no encontrado`);
      }

      // Construimos el nombre del job
      const jobName = `reminder_${id}`;

      // Intentamos eliminar el job programado si existe
      try {
        if (this.schedulerRegistry.doesExist("cron", jobName)) {
          this.schedulerRegistry.deleteCronJob(jobName);
          this.logger.debug(
            `Trabajo programado ${jobName} eliminado exitosamente`
          );
        }
      } catch (schedulerError) {
        this.logger.warn(
          `Error al eliminar el trabajo programado ${jobName}: ${schedulerError.message}`
        );
        // Continuamos con la eliminación del recordatorio aunque falle la eliminación del job
      }

      // Eliminamos el recordatorio de la base de datos
      await this.reminderRepository.delete(id);
      this.logger.log(`Recordatorio ${id} eliminado exitosamente`);
    } catch (error) {
      this.logger.error(
        `Error al eliminar el recordatorio ${id}: ${error.message}`
      );
      throw error;
    }
  }

  async getUserReminders(chatId: number): Promise<MedicationReminder[]> {
    return this.reminderRepository.find({
      where: { chatId: chatId.toString() },
      order: { createdAt: "DESC" },
    });
  }
}
