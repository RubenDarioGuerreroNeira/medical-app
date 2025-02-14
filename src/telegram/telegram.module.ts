// telegram.module.ts
import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { ConfigModule } from "@nestjs/config";
import { GeminiAIService } from "src/Gemini/gemini.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramLocationHandler } from "./telegram-location-handler.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
import { OSMService } from "./farmacias-maps.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { TelegramWebhookController } from "./telegramWebhook.controller";
import { TelegramBotService } from "./telegramBotService.service";

@Module({
  imports: [
    ConfigModule.forRoot(), // Para manejar variables de entorno
  ],
  providers: [
    TelegramService,
    GeminiAIService,
    ClinicasVenezuelaService,
    TelegramLocationHandler,
    TelegramMessageFormatter,
    OSMService,
    TelegramErrorHandler,
    TelegramBotService,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  exports: [TelegramService, TelegramBotService],
})
export class TelegramModule {}
