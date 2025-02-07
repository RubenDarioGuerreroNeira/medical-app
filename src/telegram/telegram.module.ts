// telegram.module.ts
import { Module } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { ConfigModule } from "@nestjs/config";
import { GeminiAIService } from "src/Gemini/gemini.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramLocationHandler } from "./telegram-location-handler.service";

@Module({
  imports: [
    ConfigModule.forRoot(), // Para manejar variables de entorno
  ],
  providers: [
    TelegramService,
    GeminiAIService,
    ClinicasVenezuelaService,
    TelegramLocationHandler,
  ],
  controllers: [TelegramController],
  exports: [TelegramService],
})
export class TelegramModule {}
