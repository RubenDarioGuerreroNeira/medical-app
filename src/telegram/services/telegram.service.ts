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
    @Inject("USER_STATES_MAP") private userStates: Map<number, any>,
    @Inject("TELEGRAM_BOT") private bot: TelegramBot
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
        case "recordatorios":
          await this.reminderService.mostrarMenuRecordatorios(chatId);
          break;
        case "contacto":
          await this.contactService.mostrarContacto(chatId);
          break;
        // Agregar más casos según sea necesario
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
