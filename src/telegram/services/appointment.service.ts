import {
  Injectable,
  Inject,
  forwardRef,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MedicalAppointment } from "../../Entities/MedicalAppointment.entity";
import { TelegramService } from "./telegram.service";
import { SchedulerRegistry } from "@nestjs/schedule";
import * as moment from "moment-timezone";
import { CronJob } from "cron";
import { TelegramNotificationService } from "../telegramNotificationService.service";
import TelegramBot from "node-telegram-bot-api";

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);
  private readonly soundEffects = {
    appointment: "https://example.com/sounds/appointment-alert.mp3",
    success: "https://example.com/sounds/success.mp3",
  };

  constructor(
    @InjectRepository(MedicalAppointment)
    private appointmentRepository: Repository<MedicalAppointment>,
    private schedulerRegistry: SchedulerRegistry,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
    private notificationService: TelegramNotificationService,
    @Inject("TELEGRAM_BOT") private readonly bot: TelegramBot
  ) {
    this.initializeAppointments();
    // Verificar que el bot se inyectó correctamente
    if (!this.bot) {
      this.logger.error("El bot de Telegram no se inyectó correctamente");
    }
  }

  private async initializeAppointments() {
    const activeAppointments = await this.appointmentRepository.find({
      where: { isActive: true },
    });
    activeAppointments.forEach((appointment) =>
      this.scheduleAppointment(appointment)
    );
  }

  private validateDaysOfWeek(daysOfWeek: number[]): boolean {
    if (!Array.isArray(daysOfWeek) || daysOfWeek.length === 0) {
      return false;
    }

    return daysOfWeek.every((day) => day >= 0 && day <= 6);
  }

  async createAppointment(
    chatId: number,
    appointmentData: {
      doctorName: string;
      specialty: string;
      appointmentDate: string; // formato DD-MM-YYYY
      appointmentTime: string; // formato HH:MM /AM /PM
      medicalCenterName: string;
      medicalCenterLocation?: string;
      phoneNumber?: string;
      notes?: string;
      timezone?: string;
    }
  ): Promise<MedicalAppointment> {
    const {
      doctorName,
      specialty,
      appointmentDate,
      appointmentTime,
      medicalCenterName,
      medicalCenterLocation,
      phoneNumber,
      notes,
      // timezone = "America/Caracas",
      timezone = this.getUserTimezone(chatId) || "UTC",
    } = appointmentData;

    // Validar formato de fecha
    const dateObj = moment(appointmentDate, "DD-MM-YYYY");
    if (!dateObj.isValid()) {
      throw new Error("Formato de fecha inválido. Use DD-MM-YYYY");
    }

    // Normalizar el formato de hora (acepta AM/PM)
    const normalizedTime = this.normalizeTimeFormat(appointmentTime);

    // Validar que la fecha y hora no sean anteriores a la actual
    const now = moment();
    const appointmentDateTime = moment.tz(
      `${dateObj.format("YYYY-MM-DD")} ${normalizedTime}`,
      "YYYY-MM-DD HH:mm",
      timezone
    );

    if (appointmentDateTime.isBefore(now)) {
      throw new Error(
        "No se puede programar una cita para una fecha y hora que ya pasó"
      );
    }

    const appointment = this.appointmentRepository.create({
      chatId: chatId.toString(),
      userId: chatId.toString(),
      doctorName,
      specialty,
      appointmentDate: dateObj.toDate(),
      appointmentTime: normalizedTime,
      medicalCenterName,
      medicalCenterLocation,
      phoneNumber,
      notes,
      timezone,
      createdAt: new Date(),
      isActive: true,
      type: "appointment",
    });

    const savedAppointment = await this.appointmentRepository.save(appointment);
    await this.scheduleAppointment(savedAppointment);
    return savedAppointment;
  }

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

  private async scheduleAppointment(appointment: MedicalAppointment) {
    // Programar recordatorios para 1 día antes y 2 horas antes
    this.scheduleAppointmentReminder(appointment, 24); // 24 horas antes
    this.scheduleAppointmentReminder(appointment, 2); // 2 horas antes
  }

  private scheduleAppointmentReminder(
    appointment: MedicalAppointment,
    hoursBeforeAppointment: number
  ) {
    const appointmentDate = moment(appointment.appointmentDate).format(
      "YYYY-MM-DD"
    );
    const [hours, minutes] = appointment.appointmentTime.split(":").map(Number);

    // Crear fecha y hora de la cita
    const appointmentDateTime = moment.tz(
      `${appointmentDate} ${appointment.appointmentTime}`,
      "YYYY-MM-DD HH:mm",
      appointment.timezone
    );

    // Calcular cuándo enviar el recordatorio
    const reminderTime = moment(appointmentDateTime).subtract(
      hoursBeforeAppointment,
      "hours"
    );

    // Si el tiempo del recordatorio ya pasó, no programarlo
    if (reminderTime.isBefore(moment())) {
      this.logger.log(
        `No se programó recordatorio para cita ${appointment.id} porque la hora ya pasó`
      );
      return;
    }

    const jobName = `appointment_${appointment.id}_${hoursBeforeAppointment}h`;

    // Crear el trabajo programado
    const job = new CronJob(
      reminderTime.toDate(),
      () =>
        this.sendAppointmentNotification(appointment, hoursBeforeAppointment),
      null,
      true,
      appointment.timezone
    );

    if (this.schedulerRegistry.doesExist("cron", jobName)) {
      this.schedulerRegistry.deleteCronJob(jobName);
    }

    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();

    this.logger.log(
      `Recordatorio de cita programado ${jobName} para ${reminderTime.format(
        "YYYY-MM-DD HH:mm"
      )}`
    );
  }

  // private async sendAppointmentNotification(
  //   appointment: MedicalAppointment,
  //   hoursBeforeAppointment: number
  // ) {
  //   try {
  //     if (!this.bot) {
  //       this.logger.error("No se puede enviar notificación: bot es undefined");
  //       return;
  //     }
  //     const message = this.formatAppointmentMessage(
  //       appointment,
  //       hoursBeforeAppointment
  //     );
  //     await this.bot.sendMessage(Number(appointment.chatId), message, {
  //       parse_mode: "Markdown",
  //     });

  //     this.logger.log(
  //       `Notificación de cita enviada exitosamente para: ${appointment.doctorName}`
  //     );
  //   } catch (error) {
  //     this.logger.error(
  //       `Error al enviar la notificación de cita: ${error.message}`,
  //       error.stack
  //     );
  //   }
  // }

  private async sendAppointmentNotification(
    appointment: MedicalAppointment,
    hoursBeforeAppointment: number
  ) {
    try {
      const message = this.formatAppointmentMessage(
        appointment,
        hoursBeforeAppointment
      );
      
      // Usar el servicio de notificaciones
      if (this.notificationService) {
        // Crear un método en TelegramNotificationService si no existe
        if (typeof this.notificationService.sendSimpleMessage === 'function') {
          await this.notificationService.sendSimpleMessage(
            Number(appointment.chatId),
            message
          );
        } else if (this.bot) {
          // Fallback al bot
          await this.bot.sendMessage(Number(appointment.chatId), message);
        }
      } else if (this.bot) {
        // Fallback al bot
        await this.bot.sendMessage(Number(appointment.chatId), message);
      } else {
        this.logger.error("No hay mecanismo disponible para enviar notificaciones");
      }
  
      this.logger.log(
        `Notificación de cita enviada exitosamente para: ${appointment.doctorName}`
      );
    } catch (error) {
      this.logger.error(
        `Error al enviar la notificación de cita: ${error.message}`,
        error.stack
      );
    }
  }

  private formatAppointmentMessage(
    appointment: MedicalAppointment,
    hoursBeforeAppointment: number
  ): string {
    const appointmentDate = moment(appointment.appointmentDate).format(
      "DD/MM/YYYY"
    );

    let reminderText = "";
    if (hoursBeforeAppointment === 24) {
      reminderText = "¡Recuerda que mañana tienes una cita médica!";
    } else if (hoursBeforeAppointment === 2) {
      reminderText = "¡Tu cita médica es en 2 horas!";
    }

    let message =
      `🏥 *${reminderText}*\n\n` +
      `👨‍⚕️ *Doctor:* ${appointment.doctorName}\n` +
      `🔬 *Especialidad:* ${appointment.specialty}\n` +
      `📅 *Fecha:* ${appointmentDate}\n` +
      `⏰ *Hora:* ${appointment.appointmentTime}\n` +
      `🏢 *Centro Médico:* ${appointment.medicalCenterName}\n`;

    if (appointment.medicalCenterLocation) {
      message += `📍 *Ubicación:* ${appointment.medicalCenterLocation}\n`;
    }

    if (appointment.phoneNumber) {
      message += `📞 *Teléfono:* ${appointment.phoneNumber}\n`;
    }

    if (appointment.notes) {
      message += `📝 *Notas:* ${appointment.notes}\n`;
    }

    return message;
  }

  async getUserAppointments(chatId: number): Promise<MedicalAppointment[]> {
    return this.appointmentRepository.find({
      where: { chatId: chatId.toString() },
      order: { appointmentDate: "ASC", appointmentTime: "ASC" },
    });
  }

  async getAppointmentById(id: number): Promise<MedicalAppointment | null> {
    try {
      const appointment = await this.appointmentRepository.findOne({
        where: { id },
      });

      return appointment || null;
    } catch (error) {
      this.logger.error(
        `Error al buscar cita por ID: ${error.message}`,
        error.stack
      );
      return null;
    }
  }

  async updateAppointment(
    id: number,
    updateData: Partial<MedicalAppointment>
  ): Promise<MedicalAppointment> {
    await this.appointmentRepository.update(id, updateData);
    const updatedAppointment = await this.appointmentRepository.findOne({
      where: { id },
    });

    if (!updatedAppointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    // Reprogramar los recordatorios
    if (updatedAppointment.isActive) {
      // Eliminar trabajos programados existentes
      const jobNames = [`appointment_${id}_24h`, `appointment_${id}_2h`];

      jobNames.forEach((jobName) => {
        if (this.schedulerRegistry.doesExist("cron", jobName)) {
          this.schedulerRegistry.deleteCronJob(jobName);
        }
      });

      // Programar nuevos recordatorios
      await this.scheduleAppointment(updatedAppointment);
    }

    return updatedAppointment;
  }

  async deleteAppointment(id: number): Promise<void> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Cita con ID ${id} no encontrada`);
    }

    // Eliminar los trabajos programados
    const jobNames = [`appointment_${id}_24h`, `appointment_${id}_2h`];

    jobNames.forEach((jobName) => {
      if (this.schedulerRegistry.doesExist("cron", jobName)) {
        this.schedulerRegistry.deleteCronJob(jobName);
        this.logger.log(`Trabajo programado ${jobName} eliminado`);
      }
    });

    // Eliminar la cita de la base de datos
    await this.appointmentRepository.remove(appointment);
    this.logger.log(`Cita con ID ${id} eliminada`);
  }
}
