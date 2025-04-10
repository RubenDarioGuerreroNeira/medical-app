import { Injectable, Inject } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";

@Injectable()
export class TelegramReminderService extends TelegramBaseService {
  constructor(
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

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
                text: "➕ Crear nuevo recordatorio",
                callback_data: "crear_recordatorio",
              },
            ],
            [
              {
                text: "📋 Ver mis recordatorios",
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
  }

  async iniciarCreacionRecordatorio(chatId: number): Promise<void> {
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
      await this.solicitarHoraRecordatorio(chatId, nombreMedicamento);
    });
  }

  private async solicitarHoraRecordatorio(
    chatId: number,
    nombreMedicamento: string
  ): Promise<void> {
    const message = await this.bot.sendMessage(
      chatId,
      `¿A qué hora debes tomar ${nombreMedicamento}? (Formato: HH:MM, ejemplo: 08:30)`,
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;

      const horaRecordatorio = msg.text;

      // Validar formato de hora
      if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(horaRecordatorio)) {
        await this.bot.sendMessage(
          chatId,
          "Formato de hora incorrecto. Por favor, usa el formato HH:MM (ejemplo: 08:30)."
        );
        await this.solicitarHoraRecordatorio(chatId, nombreMedicamento);
        return;
      }

      await this.solicitarFrecuenciaRecordatorio(
        chatId,
        nombreMedicamento,
        horaRecordatorio
      );
    });
  }

  private async solicitarFrecuenciaRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string
  ): Promise<void> {
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
            [{ text: "Cancelar", callback_data: "cancelar_recordatorio" }],
          ],
        },
      }
    );
  }

  async guardarRecordatorio(
    chatId: number,
    nombreMedicamento: string,
    horaRecordatorio: string,
    frecuencia: string
  ): Promise<void> {
    // Aquí implementarías la lógica para guardar el recordatorio en la base de datos
    // Por ahora, solo mostraremos un mensaje de confirmación

    await this.bot.sendMessage(
      chatId,
      `✅ Recordatorio configurado:\n\n` +
        `💊 Medicamento: ${nombreMedicamento}\n` +
        `⏰ Hora: ${horaRecordatorio}\n` +
        `🔄 Frecuencia: ${this.obtenerTextoFrecuencia(frecuencia)}\n\n` +
        `Te enviaré un recordatorio según la configuración establecida.`,
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

  private obtenerTextoFrecuencia(frecuencia: string): string {
    switch (frecuencia) {
      case "diaria":
        return "Diariamente";
      case "8h":
        return "Cada 8 horas";
      case "12h":
        return "Cada 12 horas";
      case "semanal":
        return "Una vez por semana";
      default:
        return "Personalizada";
    }
  }

  async mostrarRecordatorios(chatId: number): Promise<void> {
    // Aquí implementarías la lógica para obtener los recordatorios de la base de datos
    // Por ahora, mostraremos un mensaje de ejemplo

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
                text: "➕ Crear nuevo recordatorio",
                callback_data: "crear_recordatorio",
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
}
