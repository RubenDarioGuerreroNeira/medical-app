// telegram.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { AppointmentNotification } from "./telegram.interfaces";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(private configService: ConfigService) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    this.bot = new TelegramBot(token, { polling: true });
    this.initializeBot();
  }

  private initializeBot(): void {
    // Comando /start
    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      const userName = msg.from.first_name;

      this.bot.sendMessage(
        chatId,
        `¡Hola ${userName}! 👋\n\n` +
          "Bienvenido a CitasMedicbot 🏥\n" +
          "Soy tu asistente para gestionar tus citas médicas.\n\n" +
          "Usa /help para ver todos los comandos disponibles."
      );

      // Log del chatId para guardarlo
      this.logger.log(`Nuevo usuario: ${userName}, ChatID: ${chatId}`);
    });

    // Comando /help
    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        "📋 Comandos disponibles:\n\n" +
          "/start - Iniciar el bot\n" +
          "/help - Ver esta lista de comandos\n" +
          "/micita - Ver mi próxima cita\n" +
          "/contacto - Información de contacto del centro médico\n" +
          "/cancelar - Cancelar una cita\n\n" +
          "¿Necesitas ayuda adicional? Escribe tu pregunta y te responderemos lo antes posible."
      );
    });

    // Comando /micita (ejemplo)
    this.bot.onText(/\/micita/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, "🔍 Consultando tu próxima cita...");
      // Aquí posteriormente integrarías la consulta real a tu base de datos
    });

    // Comando /contacto
    this.bot.onText(/\/contacto/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(
        chatId,
        "📞 Información de contacto:\n\n" +
          "🏥 Centro Médico XYZ\n" +
          "📍 Dirección: [Tu dirección]\n" +
          "☎️ Teléfono: [Tu teléfono]\n" +
          "📧 Email: [Tu email]\n" +
          "⏰ Horario: Lunes a Viernes 8:00 AM - 5:00 PM"
      );
    });

    // Manejador de mensajes generales
    this.bot.on("message", (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        const chatId = msg.chat.id;
        this.bot.sendMessage(
          chatId,
          "Gracias por tu mensaje. Un representante te responderá pronto.\n" +
            "Mientras tanto, puedes usar /help para ver los comandos disponibles."
        );
      }
    });

    // Manejador de errores
    this.bot.on("error", (error) => {
      this.logger.error("Error en el bot de Telegram:", error);
    });
  }

  // Método para enviar notificaciones de citas
  async sendAppointmentNotification(
    chatId: number,
    appointment: AppointmentNotification
  ): Promise<boolean> {
    const message = `
🏥 Recordatorio de Cita Médica

📅 Fecha: ${appointment.date}
⏰ Hora: ${appointment.time}
👨‍⚕️ Doctor: ${appointment.doctorName}
🏢 Consultorio: ${appointment.location}

ℹ️ Por favor, llegue 10 minutos antes de su cita.
🎫 Presente este mensaje en recepción.

¿Necesita cancelar o reprogramar?
Use el comando /cancelar
    `;

    return this.sendMessage(chatId, message);
  }

  // Método base para enviar mensajes
  async sendMessage(chatId: number, message: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      this.logger.error("Error enviando mensaje:", error);
      return false;
    }
  }
}
