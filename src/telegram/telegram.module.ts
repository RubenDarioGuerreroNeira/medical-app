import { Module, forwardRef } from "@nestjs/common";
import { TelegramService } from "./telegram.service";
import { TelegramController } from "./telegram.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GeminiAIService } from "src/Gemini/gemini.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramLocationHandler } from "./telegram-location-handler.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
import { OSMService } from "./farmacias-maps.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { TelegramWebhookController } from "./telegramWebhook.controller";
import { TelegramBotService } from "./telegramBotService.service";
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import { ReminderService } from "./reminder.service";
import { ReminderCommands } from "./reminder.commnads";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerRegistry } from "@nestjs/schedule";
import { MedicationReminder } from "src/entities/reminder.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TelegramNotificationService } from "./telegramNotificationService.service";
import { ReminderService as ServiceReminder } from "./reminder.service";
import * as TelegramBot from "node-telegram-bot-api";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([MedicationReminder]),
    ScheduleModule.forRoot(),
  ],
  providers: [
    GeminiAIService,
    ClinicasVenezuelaService,
    TelegramLocationHandler,
    TelegramMessageFormatter,
    OSMService,
    TelegramErrorHandler,
    TelegramBotService,
    TelegramDiagnosticService,
    ReminderCommands,
    SchedulerRegistry,
    TelegramNotificationService,
    ServiceReminder,
    {
      provide: "TELEGRAM_BOT",
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
        return new TelegramBot(token, { polling: true });
      },
      inject: [ConfigService],
    },

    {
      provide: "USER_STATES_MAP", // Proveer el Map como un valor
      useValue: new Map<number, any>(),
    },
    {
      provide: ReminderService,
      useClass: ReminderService,
    },
    {
      provide: TelegramService,
      useClass: TelegramService,
    },
  ],
  controllers: [TelegramController, TelegramWebhookController],
  exports: [TelegramService, TelegramBotService],
})
export class TelegramModule {}

