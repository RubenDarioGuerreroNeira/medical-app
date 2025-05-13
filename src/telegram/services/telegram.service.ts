import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { TelegramMenuService } from "./telegram-menu.service";
import { TelegramAIService } from "./telegram-ai.service";
import { TelegramLocationService } from "./telegram-location.service";
import { TelegramReminderService } from "./telegram-reminder.service";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import { TelegramContactService } from "./telegram-contact.service";
import { TelegramColombiaService } from "../colombia/telegram-colombia.service";
import { AppointmentCommands } from "./appointment.commands.service";
import { TelegramHistorialMedicoService } from "../services/telegram-historial-medico.service";
import { TelegramLabResultsService } from "./telegram-lab-results.service";

@Injectable()
export class TelegramService {
  sendMessage(chatId: number, message: string) {
    throw new Error("Method not implemented.");
  }
  // private bot: TelegramBot;

  constructor(
    private configService: ConfigService,
    private menuService: TelegramMenuService,
    private aiService: TelegramAIService,
    private locationService: TelegramLocationService,
    private reminderService: TelegramReminderService,
    private errorHandler: TelegramErrorHandler,
    private diagnosticService: TelegramDiagnosticService,
    private contactService: TelegramContactService,
    private historialMedicoService: TelegramHistorialMedicoService,
    private labResultsService: TelegramLabResultsService, // <-- Agrega aquí

    // private colombiaService: TelegramColombiaService,
    private appointmentCommands: AppointmentCommands,
    @Inject("USER_STATES_MAP") private userStates: Map<number, any>,
    @Inject("TELEGRAM_BOT") private bot: TelegramBot
  ) {
    this.initializeBot();
    this.appointmentCommands.setupCommands();
  }

  private async initializeBot(): Promise<void> {
    try {
      const diagnostic = await this.diagnosticService.diagnoseBot(this.bot);

      if (diagnostic.status === "ERROR") {
        await this.diagnosticService.fixCommonIssues(this.bot);
      }

      this.setupHandlers();
    } catch (error) {
      this.errorHandler.handleServiceError(this.bot, error, "initializeBot");
    }
  }

  private setupHandlers(): void {
    // Manejador de comandos
    this.bot.onText(/\/start/, (msg) =>
      this.menuService.mostrarMenuPrincipal(msg.chat.id)
    );
    this.bot.onText(/\/help/, (msg) =>
      this.menuService.mostrarAyuda(msg.chat.id)
    );

    // Manejador de callbacks
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Manejador de mensajes
    this.bot.on("message", async (msg) => {
      await this.handleMessage(msg);
    });
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      //callback para cuando selecciono recordatorio semanal,
      // me muestra los dias de la semana para que seleccione el dia
      if (data.startsWith("day_semanal_")) {
        const parts = data.split("_");
        const dayNumber = parseInt(parts[2]);
        const nombreMedicamento = parts[3];
        const horaRecordatorio = parts.slice(4).join("_"); // Por si la hora tiene espacios

        const dayNames = [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ];
        const nombreDia = dayNames[dayNumber];

        await this.reminderService.guardarRecordatorio(
          chatId,
          nombreMedicamento,
          horaRecordatorio,
          "semanal",
          dayNumber,
          nombreDia
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de exportación de recordatorios
      if (data === "exportar_recordatorios") {
        await this.reminderService.mostrarOpcionesExportacion(chatId);
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      if (
        data === "exportar_recordatorios_pdf" ||
        data === "exportar_recordatorios_csv"
      ) {
        const formato = data.endsWith("_pdf") ? "pdf" : "csv";
        await this.reminderService.exportarRecordatorios(chatId, formato);
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      if (data.startsWith("freq_")) {
        const [freq, nombreMedicamento, horaRecordatorio] = data
          .split("_")
          .slice(1);

        if (freq === "semanal") {
          // Mostrar selector de días de la semana para creación
          await this.reminderService.mostrarSelectorDiaSemanal(
            chatId,
            nombreMedicamento,
            horaRecordatorio
          );
          await this.bot.answerCallbackQuery(callbackQuery.id);
          return;
        }

        // Para otras frecuencias, crear el recordatorio directamente
        await this.reminderService.guardarRecordatorio(
          chatId,
          nombreMedicamento,
          horaRecordatorio,
          freq
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de edición de recordatorios
      if (data.startsWith("edit_reminder_")) {
        const reminderId = parseInt(data.split("_")[2]);
        await this.reminderService.iniciarEdicionRecordatorio(
          chatId,
          reminderId
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de actualización de frecuencia
      if (data.startsWith("update_freq_")) {
        const parts = data.split("_");
        const reminderId = parseInt(parts[2]);
        const frecuencia = parts[3];
        await this.reminderService.actualizarFrecuencia(
          chatId,
          reminderId,
          frecuencia
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks para eliminar recordatorios
      if (data.startsWith("delete_reminder_")) {
        const reminderId = parseInt(data.split("_")[2]);
        await this.reminderService.eliminarRecordatorio(chatId, reminderId);
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de historial médico
      if (data.startsWith("historial_detalle_")) {
        const historialId = parseInt(data.replace("historial_detalle_", ""));
        await this.historialMedicoService.mostrarHistorialMedico(chatId);
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // ...existing code inside handleCallbackQuery...
      // Manejar callbacks de actualización de día semanal (edición)
      if (data.startsWith("update_day_semanal_")) {
        const parts = data.split("_");
        const reminderId = parseInt(parts[3]);
        const dayNumber = parseInt(parts[4]);
        const dayNames = [
          "Domingo",
          "Lunes",
          "Martes",
          "Miércoles",
          "Jueves",
          "Viernes",
          "Sábado",
        ];
        const nombreDia = dayNames[dayNumber];
        await this.reminderService.actualizarDiaSemanal(
          chatId,
          reminderId,
          dayNumber,
          nombreDia
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // este callback se activa cuando en creacion de nuevo recordatrio,
      //encuentra un medicamento con el mismo nombre
      if (data.startsWith("continue_create_")) {
        const nombreMedicamento = data.substring("continue_create_".length);
        await this.reminderService.solicitarDosis(chatId, nombreMedicamento);
        await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      switch (data) {
        case "menu_principal":
          await this.menuService.mostrarMenuPrincipal(chatId);
          break;
        case "consulta_medica":
          await this.aiService.iniciarConsultaMedica(chatId);
          break;
        case "solicitar_ubicacion_farmacia":
          await this.locationService.solicitarUbicacion(chatId, "farmacia");
          break;
        case "mostrarCentrosCercanos":
          await this.locationService.solicitarUbicacion(chatId, "clinica");
          break;

        // Agregar manejo para crear_recordatorio medico (trataniento)
        case "recordatorios":
          await this.reminderService.mostrarMenuRecordatorios(chatId);
          break;

        case "ver_recordatorios":
          await this.reminderService.mostrarEditarRecordatorio(chatId);
          break;

        case "crear_recordatorio":
        case "create_reminder":
          await this.reminderService.iniciarCreacionRecordatorio(chatId);
          break;

        case "editar_recordatorio_medico":
          await this.reminderService.mostrarEditarRecordatorio(chatId);
          break;

        // Agregar casos para los botones de edición específicos
        case "edit_name":
          await this.reminderService.solicitarNuevoNombre(chatId);
          break;
        case "edit_dosage":
          await this.reminderService.solicitarNuevaDosis(chatId);
          break;
        case "edit_time":
          await this.reminderService.solicitarNuevaHora(chatId);
          break;
        case "edit_frequency":
          await this.reminderService.solicitarNuevaFrecuencia(chatId);
          break;

        case "eliminar_recordatorio":
          await this.reminderService.mostrarEliminarRecordatorio(chatId);
          break;

        case "contacto":
          await this.contactService.mostrarContacto(chatId);
          break;
        case "recordatorio_cita_medica":
          await this.appointmentCommands.mostrarMenuCitas(chatId);
          break;
        // case "Centros médicos Colombia":
        //   await this.colombiaService.solicitarCiudadColombia(chatId);
        //   break;

        // Agregar más casos según sea necesario

        case "historial_medico":
          await this.historialMedicoService.handleHistorialMedicoCommandByChatId(
            chatId
          );
          break;
        // Agregar estos casos al switch
        case "nuevo_historial":
          await this.historialMedicoService.iniciarRegistroHistorialMedico(
            chatId
          );
          break;
        case "ver_historiales":
          await this.historialMedicoService.mostrarHistorialMedico(chatId);
          break;

        case "interpretar_resultados":
          await this.labResultsService.iniciarInterpretacionResultados(chatId);
          break;
      }

      await this.bot.answerCallbackQuery(callbackQuery.id);
    } catch (error) {
      await this.errorHandler.handleServiceError(
        this.bot,
        error,
        "handleCallbackQuery",
        chatId
      );
    }
  }

  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;

    try {
      if (msg.text === "❌ Cancelar") {
        await this.menuService.mostrarMenuPrincipal(chatId);
        return;
      }

      if (msg.photo) {
        await this.aiService.handleImageMessage(chatId, msg);
        return;
      }

      // Manejar otros tipos de mensajes según sea necesario
    } catch (error) {
      await this.errorHandler.handleServiceError(
        this.bot,
        error,
        "handleMessage",
        chatId
      );
    }
  }
}
