import { Injectable, Logger, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";

@Injectable()
export class TelegramBaseService {
  // protected bot: TelegramBot;
  protected readonly logger = new Logger(TelegramBaseService.name);

  constructor(
    protected configService: ConfigService,
    protected errorHandler: TelegramErrorHandler,
    protected diagnosticService: TelegramDiagnosticService,

    @Inject("TELEGRAM_BOT") protected bot: TelegramBot
  ) {
    this.setupBaseHandlers();
  }

  private setupBaseHandlers(): void {
    this.bot.on("error", (error) => {
      this.logger.error("Error en el bot de Telegram:", error);
    });

    this.setupCommands();
  }

  private setupCommands(): void {
    try {
      this.bot.setMyCommands([
        { command: "/start", description: "Iniciar el bot" },
        { command: "/help", description: "Ver comandos disponibles" },
      ]);
    } catch (error) {
      this.logger.error("Error setting up commands:", error);
    }
  }

  protected async sendMessage(
    chatId: number,
    message: string
  ): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      this.logger.error("Error enviando mensaje:", error);
      return false;
    }
  }

  protected escapeMarkdown(text: string): string {
    if (!text) return "No disponible";
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }
}
