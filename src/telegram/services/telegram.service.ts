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
import { EmergencyInfoService } from "./emergency-info.service";

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
    @Inject("TELEGRAM_BOT") private bot: TelegramBot,
    private emergencyInfoService: EmergencyInfoService // <-- Agrega aquí
  ) {
    this.initializeBot();
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
    this.bot.onText(/\/start(?: (.+))?/, (msg, match) =>
      this.handleStartCommand(msg, match)
    );

    // modifico el comando start para que capture el codigo de emergencia
    // this.bot.onText(/\/start (.+)/, (msg, match) => {
    //   this.handleStartCommand(msg, match);
    // });
    // this.bot.onText(/\/start/, (msg) => this.handleStartCommand(msg));
    this.bot.onText(/\/help/, (msg) => this.handleHelpCommand(msg));
    this.bot.onText(/\/emergencia/, (msg) =>
      this.emergencyInfoService.mostrarMenuEmergencia(msg.chat.id)
    );

    // Comandos de Historial Médico (movidos desde TelegramHistorialMedicoService)
    this.bot.onText(/\/historialmedico/, (msg) =>
      this.historialMedicoService.handleHistorialMedicoCommand(msg)
    );
    this.bot.onText(/\/nuevohistorial/, (msg) => {
      this.userStates.delete(msg.chat.id); // Limpiar estado previo
      this.historialMedicoService.iniciarRegistroHistorialMedico(msg.chat.id);
    });
    this.bot.onText(/\/mishistoriales/, (msg) => {
      this.userStates.delete(msg.chat.id); // Limpiar estado previo
      this.historialMedicoService.mostrarHistorialMedico(msg.chat.id);
    });

    // Manejador de callbacks
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    // Manejador de mensajes
    this.bot.on("message", async (msg) => {
      // Ignorar mensajes que son comandos ya manejados por onText
      if (
        msg.text &&
        /^\/(start|help|historialmedico|nuevohistorial|mishistoriales)/.test(
          msg.text
        )
      ) {
        return;
      }
      await this.handleMessage(msg);
    });
  }

  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    if (!callbackQuery.message) {
      this.errorHandler.handleServiceError(
        this.bot,
        new Error("Callback query without message"),
        "handleCallbackQuery"
      );
      if (callbackQuery.id)
        await this.bot
          .answerCallbackQuery(callbackQuery.id)
          .catch((err) =>
            this.errorHandler.handleServiceError(
              this.bot,
              err,
              "answerCallbackQuery"
            )
          );
      return;
    }
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      // Responder al callback lo antes posible
      if (callbackQuery.id) {
        await this.bot
          .answerCallbackQuery(callbackQuery.id)
          .catch((err) =>
            this.errorHandler.handleServiceError(
              this.bot,
              err,
              "answerCallbackQuery",
              chatId
            )
          );
      }

      // Manejar callbacks de selección de zona horaria
      if (data.startsWith("tz_")) {
        const selectedTimezone = data.substring("tz_".length);
        const state = this.userStates.get(chatId);

        if (state && state.reminderData) {
          state.reminderData.timezone = selectedTimezone;
          // El siguiente paso después de la zona horaria es la frecuencia
          state.step = "awaiting_frequency"; // Asegúrate que este sea el nombre correcto del paso
          this.userStates.set(chatId, state);

          // Llamar al método que solicita la frecuencia en TelegramReminderService
          await this.reminderService.solicitarFrecuenciaRecordatorio(
            chatId,
            state.reminderData.medicationName,
            state.reminderData.dosage,
            state.reminderData.reminderTime
          );
        } else {
          this.errorHandler.handleServiceError(
            this.bot,
            new Error(
              `Estado no encontrado o reminderData ausente para callback de timezone: ${data}`
            ),
            "handleCallbackQuery_Timezone",
            chatId
          );
        }
        return;
      }


      // Manejar callback para marcar medicamento como tomado

      if (data.startsWith("mark_taken_")) {
        const reminderId = parseInt(data.split("_")[2]);
        const originalMessageId = callbackQuery.message?.message_id; // Obtener el ID del mensaje
        await this.reminderService.handleMarkAsTaken(
          chatId,
          reminderId,
          originalMessageId
        );
        return;
      }

      // Manejar callback para mostrar estadísticas de medicamentos
      if (data === "estadisticas_medicamentos") {
        await this.reminderService.mostrarEstadisticasMedicamentos(chatId);
        // await this.bot.answerCallbackQuery(callbackQuery.id); // Ya se hace al inicio
        return;
      }

      // manejo de generar codigo QR
      if (data === "descargar_tarjeta_pdf") {
        const pdfEnviado =
          await this.emergencyInfoService.enviarTarjetaEmergenciaPDF(chatId);
        if (pdfEnviado) {
          await this.bot.sendMessage(
            chatId,
            "✅ Su código QR  ya fue generado satisfactoriamente. en formato PDF Puedes descargarlo o compartirlo."
          );
        }
        // El mensaje de error (si no se pudo generar) ya se envía desde enviarTarjetaEmergenciaPDF
        setTimeout(async () => {
          await this.menuService.mostrarMenuPrincipal(chatId); // Mostrar menú principal en ambos casos
        }, 6000);

        return;
      }

      // Manejo global de "menu_principal"
      if (data === "menu_principal") {
        this.userStates.delete(chatId); // Limpiar estado
        await this.menuService.mostrarMenuPrincipal(chatId);
        return;
      }

      // Delegar a AppointmentCommands si el callback es de citas
      if (
        data === "nuevacita" ||
        data === "ver_citas" ||
        data === "select_edit_appointment" ||
        data === "select_delete_appointment" ||
        data.startsWith("edit_appointment_") ||
        data.startsWith("delete_appointment_") ||
        data === "confirm_delete_appointment" ||
        data === "cancel_delete_appointment" ||
        data === "recordatorio_cita_medica"
      ) {
        if (data === "recordatorio_cita_medica") {
          // Opción del menú principal para citas
          this.userStates.delete(chatId);
          await this.appointmentCommands.mostrarMenuCitas(chatId);
        } else {
          await this.appointmentCommands.handleAppointmentCallback(
            chatId,
            callbackQuery
          );
        }
        return;
      }

      // (Los que usan 'once' se manejan internamente en ese servicio)
      if (data === "historial_volver") {
        // Ejemplo de callback que podría ser manejado aquí
        await this.historialMedicoService.mostrarHistorialMedico(chatId);
        return;
      }
      // Otros callbacks de historial médico que no son 'once' se añadirían aquí.

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
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de exportación de recordatorios
      if (data === "exportar_recordatorios") {
        await this.reminderService.mostrarOpcionesExportacion(chatId);
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      if (
        data === "exportar_recordatorios_pdf" ||
        data === "exportar_recordatorios_csv"
      ) {
        const formato = data.endsWith("_pdf") ? "pdf" : "csv";
        await this.reminderService.exportarRecordatorios(chatId, formato);
        // await this.bot.answerCallbackQuery(callbackQuery.id);
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
          // await this.bot.answerCallbackQuery(callbackQuery.id);
          return;
        }

        // Para otras frecuencias, crear el recordatorio directamente
        await this.reminderService.guardarRecordatorio(
          chatId,
          nombreMedicamento,
          horaRecordatorio,
          freq
        );
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de edición de recordatorios
      if (data.startsWith("edit_reminder_")) {
        const reminderId = parseInt(data.split("_")[2]);
        await this.reminderService.iniciarEdicionRecordatorio(
          chatId,
          reminderId
        );
        // await this.bot.answerCallbackQuery(callbackQuery.id);
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
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks para eliminar recordatorios
      if (data.startsWith("delete_reminder_")) {
        const reminderId = parseInt(data.split("_")[2]);
        await this.reminderService.eliminarRecordatorio(chatId, reminderId);
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // Manejar callbacks de historial médico
      if (data.startsWith("historial_detalle_")) {
        const historialId = parseInt(data.replace("historial_detalle_", ""));
        await this.historialMedicoService.mostrarHistorialMedico(chatId);
        // await this.bot.answerCallbackQuery(callbackQuery.id);
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
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      // este callback se activa cuando en creacion de nuevo recordatrio,
      //encuentra un medicamento con el mismo nombre
      if (data.startsWith("continue_create_")) {
        const nombreMedicamento = data.substring("continue_create_".length);
        await this.reminderService.solicitarDosis(chatId, nombreMedicamento);
        // await this.bot.answerCallbackQuery(callbackQuery.id);
        return;
      }

      switch (data) {
        case "consulta_medica":
          this.userStates.delete(chatId);
          await this.aiService.iniciarConsultaMedica(chatId);
          break;
        case "solicitar_ubicacion_farmacia":
          this.userStates.delete(chatId);
          await this.locationService.solicitarUbicacion(chatId, "farmacia");
          break;

        case "mostrarCentrosCercanos":
          this.userStates.delete(chatId);
          await this.locationService.solicitarUbicacion(chatId, "clinica");
          break;

        // Agregar manejo para crear_recordatorio medico (trataniento)
        case "recordatorios":
          this.userStates.delete(chatId);
          await this.reminderService.mostrarMenuRecordatorios(chatId);
          break;

        case "ver_recordatorios":
          await this.reminderService.mostrarEditarRecordatorio(chatId);
          break;

        case "crear_recordatorio":
        case "create_reminder":
          this.userStates.delete(chatId);
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
          this.userStates.delete(chatId);
          await this.contactService.mostrarContacto(chatId);
          break;

        case "historial_medico":
          await this.historialMedicoService.handleHistorialMedicoCommandByChatId(
            chatId
          );
          break;
        // Agregar estos casos al switch
        case "nuevo_historial":
          this.userStates.delete(chatId);
          await this.historialMedicoService.iniciarRegistroHistorialMedico(
            chatId
          );
          break;
        case "ver_historiales":
          this.userStates.delete(chatId);
          await this.historialMedicoService.mostrarHistorialMedico(chatId);
          break;

        case "interpretar_resultados":
          this.userStates.delete(chatId);
          await this.labResultsService.iniciarInterpretacionResultados(chatId);
          break;
        // }

        case "menu_emergencia":
          await this.emergencyInfoService.mostrarMenuEmergencia(chatId);
          break;
        case "configurar_emergencia":
          await this.emergencyInfoService.iniciarConfiguracionEmergencia(
            chatId
          );
          break;
        case "ver_emergencia":
          await this.emergencyInfoService.mostrarInformacionEmergencia(chatId);
          break;
        case "generar_codigo_emergencia":
          await this.emergencyInfoService.generarCodigoAccesoEmergencia(chatId);
          break;
        case "crear_tarjeta_emergencia":
          await this.emergencyInfoService.crearTarjetaEmergencia(chatId);
          break;

        // await this.bot.answerCallbackQuery(callbackQuery.id);

        default:
          // Si ningún caso coincide, podría ser un callback manejado por un listener 'once' en otro servicio,
          // o un callback desconocido.
          // this.diagnosticService.logUnknownCallback(chatId, data);
          // No envíes "Opción no reconocida" aquí para permitir que los listeners 'once' funcionen.
          break;
      }
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
    // Ignorar mensajes sin texto o sin datos relevantes (ej. solo stickers, etc.)
    // a menos que un flujo específico espere algo diferente a texto/foto.
    if (!msg.text && !msg.photo && !msg.location) {
      // Añadir msg.location si es relevante para algún flujo
      return;
    }

    const chatId = msg.chat.id;
    const userState = this.userStates.get(chatId);
    try {
      // 1. Flujos activos basados en userState

      if (
        userState &&
        userState.currentOperation === "configure_emergency_info"
      ) {
        await this.emergencyInfoService.handleConfigStep(msg);
        return;
      }

      if (userState) {
        const operation = userState.currentOperation;
        if (
          operation === "create_appointment" ||
          operation === "edit_appointment" ||
          operation === "delete_appointment"
        ) {
          await this.appointmentCommands.handleUserInput(msg);
          return;
        }
        if (operation === "create_historial_medico") {
          return;
        }
        if (operation === "create_reminder") {
        }
        // Añadir otros currentOperation para otros servicios (LabResults, AI si dejan de usar onReplyToMessage)
      }

      // 2. Mensajes genéricos o inicio de flujos no comandados
      if (msg.text === "❌ Cancelar") {
        await this.menuService.mostrarMenuPrincipal(chatId);
        return;
      }

      if (msg.photo) {
        // Si no hay un flujo activo esperando una foto, se asume que es para el servicio de IA.
        // Idealmente, se establecería un estado como 'awaiting_ai_photo'.
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
  private async handleStartCommand(
    msg: TelegramBot.Message,
    match: RegExpMatchArray | null
  ): Promise<void> {
    const chatId = msg.chat.id;
    this.userStates.delete(chatId); // Limpiar estado previo
    const payload = match && match[1] ? match[1].trim() : null;

    if (payload) {
      // Asumimos que el payload es un código de acceso para información de emergencia
      // En una aplicación más compleja, podrías tener diferentes tipos de payloads
      const infoMostrada =
        await this.emergencyInfoService.mostrarInformacionPorCodigoAcceso(
          chatId,
          payload
        );
      if (infoMostrada) {
        return; // Si se mostró la info de emergencia, no mostramos el menú principal inmediatamente.
      }
    }

    await this.menuService.mostrarMenuPrincipal(chatId);
  }

  private async handleHelpCommand(msg: TelegramBot.Message): Promise<void> {
    this.userStates.delete(msg.chat.id); // Limpiar estado previo
    await this.menuService.mostrarAyuda(msg.chat.id);
  }
} // final
