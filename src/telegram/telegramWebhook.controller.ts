import { Controller, Post, Body, Logger } from "@nestjs/common";
import { TelegramBotService } from "./telegramBotService.service";

@Controller("telegram-webhook")
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Post()
  async handleWebhook(@Body() update: any) {
    try {
      this.logger.debug("Received webhook update:", update);
      // Aquí procesas la actualización según tus necesidades
      if (update.message?.chat?.id) {
        await this.telegramBotService.sendMessage(
          update.message.chat.id,
          "Recibido tu mensaje!"
        );
      }
    } catch (error) {
      this.logger.error("Error processing webhook:", error);
    }
  }
}
