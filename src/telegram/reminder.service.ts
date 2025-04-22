import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicationReminder } from "../Entities/MedicationReminder.entity";
import { TelegramService } from "./services/telegram.service";
import { SchedulerRegistry } from "@nestjs/schedule";
import * as moment from "moment-timezone";
import { CronJob } from "cron";
import { TelegramNotificationService } from "./telegramNotificationService.service";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly soundEffects = {
    reminder: "https://example.com/sounds/medical-alert.mp3",
    success: "https://example.com/sounds/success.mp3",
  };

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
    // @Inject(forwardRef(() => TelegramNotificationService))
    private notificationService: TelegramNotificationService,
    @Inject("TELEGRAM_BOT") private readonly bot: TelegramBot
  ) {
    this.initializeReminders();

    if (!bot || typeof bot.getMe !== "function") {
      this.logger.error(
        "Invalid TelegramBot instance provided to ReminderService"
      );
    } else {
      this.logger.log("Valid TelegramBot instance received in ReminderService");
    }
  }

  private async initializeReminders() {
    const activeReminders = await this.reminderRepository.find({
      where: { isActive: true },
    });
    activeReminders.forEach((reminder) => this.scheduleReminder(reminder));
  }

  private validateDaysOfWeek(daysOfWeek: number[]): boolean {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return false;
    }

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
    }
  ): Promise<MedicationReminder> {
    const {
      medicationName,
      dosage,
      reminderTime,
      daysOfWeek,
      // timezone = "America/Caracas",
      //uso la zona horaria del usuario
      timezone = this.getUserTimezone(chatId) || "UTC",
    } = reminderData;

    // valido que los días de la semana sean correctos
    if (!this.validateDaysOfWeek(daysOfWeek) || daysOfWeek.length === 0) {
      throw new Error("Los Días deben estar entre 0(Domingo y 6 (Sabado)");
    }

    // valido que la hora del recordatorio no sea menor a la hora actual
    const now = new Date();
    const [hours, minutes] = this.normalizeTimeFormat(reminderTime)
      .split(":")
      .map(Number);
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    // Si la hora ya pasó hoy y se intenta programar para hoy (día actual en daysOfWeek)
    // const currentDay = now.getDay();
    // if (reminderDate < now && daysOfWeek.includes(currentDay)) {
    //   throw new Error(
    //     "No se puede programar un recordatorio para una hora que ya pasó hoy"
    //   );
    // }

    // Normalizar el formato de hora para almacenarlo en la base de datos
    const normalizedTime = this.normalizeTimeFormat(reminderTime);

    const reminder = this.reminderRepository.create({
      chatId: chatId.toString(),
      userId: chatId.toString(),
      medicationName,
      dosage,
      reminderTime: normalizedTime, // Usar el formato normalizado
      daysOfWeek,
      timezone,
      createdAt: new Date(),
      isActive: true,
      type: "medication",
    });

    const savedReminder = await this.reminderRepository.save(reminder);
    await this.scheduleReminder(savedReminder);
    return savedReminder;
  }

  // Método para obtener la zona horaria del usuario
  private getUserTimezone(chatId: number): string | null {
    try {
      // Aquí podrías implementar lógica para obtener la zona horaria guardada del usuario
      // Por ejemplo, consultando una tabla de preferencias de usuario
      // Por ahora, devolvemos null para usar el valor predeterminado
      return null;
    } catch (error) {
      this.logger.error(
        `Error al obtener zona horaria del usuario: ${error.message}`
      );
      return null;
    }
  }

  // Método para normalizar el formato de hora a HH:MM (formato 24 horas)
  private normalizeTimeFormat(time: string): string {
    // Eliminar espacios en blanco y convertir a minúsculas
    const cleanTime = time.trim().toLowerCase();

    // Verificar si contiene am/pm
    let hours: number;
    let minutes: number;

    if (cleanTime.includes("am") || cleanTime.includes("pm")) {
      // Formato 12 horas (e.g., "9:00 am", "3:30 pm")
      const timePart = cleanTime.replace(/\s*(am|pm)\s*$/i, "");
      const [hoursStr, minutesStr] = timePart.split(":");

      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);

      // Convertir a formato 24 horas
      if (cleanTime.includes("pm") && hours < 12) {
        hours += 12;
      } else if (cleanTime.includes("am") && hours === 12) {
        hours = 0;
      }
    } else {
      // Formato 24 horas (e.g., "09:00", "15:30")
      const [hoursStr, minutesStr] = cleanTime.split(":");
      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);
    }

    // Validar que los valores sean números válidos
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        `Formato de hora inválido: ${time}. Use formato HH:MM o HH:MM AM/PM`
      );
    }

    // Devolver en formato HH:MM
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
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
      `Recordatorio programado ${jobName} con cron: ${cronExpression}`
    );
  }

  private createCronExpression(time: string, daysOfWeek: number[]): string {
    // Eliminar espacios en blanco y convertir a minúsculas
    const cleanTime = time.trim().toLowerCase();

    // Verificar si contiene am/pm
    let hours: number;
    let minutes: number;

    if (cleanTime.includes("am") || cleanTime.includes("pm")) {
      // Formato 12 horas (e.g., "9:00 am", "3:30 pm")
      const timePart = cleanTime.replace(/\s*(am|pm)\s*$/i, "");
      const [hoursStr, minutesStr] = timePart.split(":");

      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);

      // Convertir a formato 24 horas
      if (cleanTime.includes("pm") && hours < 12) {
        hours += 12;
      } else if (cleanTime.includes("am") && hours === 12) {
        hours = 0;
      }
    } else {
      // Formato 24 horas (e.g., "09:00", "15:30")
      const [hoursStr, minutesStr] = cleanTime.split(":");
      hours = parseInt(hoursStr, 10);
      minutes = parseInt(minutesStr, 10);
    }

    // Validar que los valores sean números válidos
    if (
      isNaN(hours) ||
      isNaN(minutes) ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        `Formato de hora inválido: ${time}. Use formato HH:MM o HH:MM AM/PM`
      );
    }

    const daysExpression = daysOfWeek.join(",");
    return `${minutes} ${hours} * * ${daysExpression}`;
  }

  // Modificar el método sendReminderNotification para usar el bot directamente
  private async sendReminderNotification(reminder: MedicationReminder) {
    try {
      // Enviar sonido de alerta
      await this.notificationService.sendReminderNotification(reminder);
      this.logger.log(
        `Notificación enviada exitosamente para el medicamento: ${reminder.medicationName}`
      );
    } catch (error) {
      this.logger.error(
        `Error al enviar la notificación: ${error.message}`,
        error.stack
      );

      try {
        // Mecanismo de respaldo usando el mensaje básico
        const message = this.formatReminderMessage(reminder);
        await this.bot.sendMessage(Number(reminder.chatId), message);
      } catch (fallbackError) {
        this.logger.error(
          `Error al enviar la notificación de respaldo: ${fallbackError.message}`
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
      throw new NotFoundException("Recordatorio no encontrado");
    }

    try {
      await this.notificationService.sendReminderNotification({
        ...reminder,
        type: reminder.type === "medication" ? "confirmation" : "reminder", // Esto indica que es una confirmación
      });
    } catch (error) {
      this.logger.error(`Error al enviar confirmación: ${error.message}`);

      // Intento de respaldo usando mensaje básico
      try {
        await this.telegramService.sendMessage(
          Number(reminder.chatId),
          "✅ ¡Medicamento registrado como tomado!"
        );
      } catch (fallbackError) {
        this.logger.error(
          `Error en mensaje de respaldo: ${fallbackError.message}`
        );
      }
    }
  }

  async updateReminder(
    id: number,
    updateData: Partial<MedicationReminder>
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
      if (this.schedulerRegistry.doesExist("cron", jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
      }
    }

    return updatedReminder;
  }

  async deleteReminder(id: number): Promise<void> {
    const reminder = await this.reminderRepository.findOne({
      where: { id },
    });

    if (!reminder) {
      throw new NotFoundException(`Recordatorio con ID ${id} no encontrado`);
    }

    // Eliminar el trabajo programado
    const jobName = `reminder_${id}`;
    if (this.schedulerRegistry.doesExist("cron", jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
      this.logger.log(`Trabajo programado ${jobName} eliminado`);
    }

    // Eliminar el recordatorio de la base de datos
    await this.reminderRepository.remove(reminder);
    this.logger.log(`Recordatorio con ID ${id} eliminado`);
  }

  async getUserReminders(chatId: number): Promise<MedicationReminder[]> {
    return this.reminderRepository.find({
      where: { chatId: chatId.toString() },
      order: { createdAt: "DESC" },
    });
  }

  // async getReminderById(id: number): Promise<MedicationReminder | null> {
  //   try {
  //     const reminder = await this.reminderRepository.findOne({
  //       where: { id },
  //     });

  //     return reminder || null;
  //   } catch (error) {
  //     this.logger.error(
  //       `Error al buscar recordatorio por ID: ${error.message}`,
  //       error.stack
  //     );
  //     return null;
  //   }
  // }
  // notificaciones
  async getReminderById(reminderId: number): Promise<MedicationReminder> {
    try {
      const reminder = await this.reminderRepository.findOne({
        where: { id: reminderId },
      });

      if (!reminder) {
        this.logger.warn(`Reminder with ID ${reminderId} not found`);
        return null;
      }

      return reminder;
    } catch (error) {
      this.logger.error(
        `Error getting reminder by ID: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async logMedicationTaken(reminderId: number): Promise<void> {
    try {
      const reminder = await this.getReminderById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      // Actualizar el registro de medicamentos tomados
      // Aquí podrías agregar un campo lastTaken a tu entidad MedicationReminder
      // o crear una nueva entidad para registrar el historial de medicamentos tomados

      await this.reminderRepository.update(
        { id: reminderId },
        { lastTaken: new Date() }
      );

      this.logger.log(`Medication taken logged for reminder ID: ${reminderId}`);
    } catch (error) {
      this.logger.error(
        `Error logging medication taken: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }

  async postponeReminder(reminderId: number, minutes: number): Promise<string> {
    try {
      const reminder = await this.getReminderById(reminderId);
      if (!reminder) {
        throw new Error(`Reminder with ID ${reminderId} not found`);
      }

      // Calcular la nueva hora del recordatorio
      const now = new Date();
      const postponedTime = new Date(now.getTime() + minutes * 60000);

      // Formatear la hora para mostrarla al usuario (HH:MM)
      const formattedTime = postponedTime.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

      // Programar el nuevo recordatorio
      const jobName = `postponed_reminder_${reminder.id}_${now.getTime()}`;
      const job = new CronJob(
        postponedTime,
        () => this.notificationService.sendReminderNotification(reminder),
        null,
        true
      );

      // Registrar el trabajo en el scheduler
      this.schedulerRegistry.addCronJob(jobName, job);

      this.logger.log(
        `Reminder ${reminderId} postponed for ${minutes} minutes to ${formattedTime}`
      );

      return formattedTime;
    } catch (error) {
      this.logger.error(
        `Error postponing reminder: ${error.message}`,
        error.stack
      );
      throw error;
    }
  }
}
