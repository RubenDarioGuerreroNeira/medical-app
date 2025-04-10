import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import * as TelegramBot from "node-telegram-bot-api";

// Controladores
import { TelegramController } from "./telegram.controller";
import { TelegramWebhookController } from "./telegramWebhook.controller";

// Entidades
import { MedicationReminder } from "../Entities/MedicationReminder.entity";

// Servicios de utilidad que se mantienen
import { GeminiAIService } from "src/Gemini/gemini.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import { OSMService } from "./farmacias-maps.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramBotService } from "./telegramBotService.service";

// Importar el servicio original para compatibilidad
import { TelegramService as OriginalTelegramService } from "./telegram.service";

// Nuevos servicios refactorizados
import { TelegramBaseService } from "./services/telegram-base.service";
import { TelegramAIService } from "./services/telegram-ai.service";
import { TelegramMenuService } from "./services/telegram-menu.service";
import { TelegramLocationService } from "./services/telegram-location.service";
import { TelegramReminderService } from "./services/telegram-reminder.service";
import { TelegramService } from "./services/telegram.service";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([MedicationReminder]),
    ScheduleModule.forRoot(),
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    // Servicios de utilidad
    GeminiAIService,
    TelegramErrorHandler,
    TelegramDiagnosticService,
    SchedulerRegistry,

    // Servicios necesarios para los nuevos servicios refactorizados
    OSMService,
    ClinicasVenezuelaService,

    // Centralizar la creación del bot
    {
      provide: "TELEGRAM_BOT",
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
        // Crear una única instancia del bot con polling
        return new TelegramBot(token, { polling: true });
      },
      inject: [ConfigService],
    },

    // // Proveer TelegramBotService con la instancia compartida del bot
    {
      provide: TelegramBotService,
      useFactory: (configService: ConfigService) => {
        return new TelegramBotService(configService);
      },
      inject: [ConfigService],
    },

    // Nuevos servicios refactorizados
    TelegramBaseService,
    TelegramAIService,
    TelegramMenuService,
    TelegramLocationService,
    TelegramReminderService,
    TelegramService,

    // Proveer el servicio original para compatibilidad con controladores existentes
    // {
    //   provide: OriginalTelegramService,
    //   useFactory: (
    //     configService: ConfigService,
    //     userStates: Map<number, any>,
    //     geminiService: GeminiAIService,
    //     clinicasService: ClinicasVenezuelaService,
    //     osmService: OSMService,
    //     errorHandler: TelegramErrorHandler,
    //     diagnosticService: TelegramDiagnosticService,
    //     bot: TelegramBot
    //   ) => {
    //     // Crear una instancia del servicio original pero usando el bot compartido
    //     const service = new OriginalTelegramService(
    //       configService,
    //       userStates,
    //       geminiService,
    //       clinicasService,
    //       osmService,
    //       null, // locationHandler
    //       null, // messageFormatter
    //       errorHandler,
    //       diagnosticService,
    //       null, // reminderService
    //       bot
    //     );
    //     // Reemplazar la instancia del bot con la compartida
    //     // service["bot"] = bot;
    //     return service;
    //   },
    //   inject: [
    //     ConfigService,
    //     "USER_STATES_MAP",
    //     GeminiAIService,
    //     ClinicasVenezuelaService,
    //     OSMService,
    //     TelegramErrorHandler,
    //     TelegramDiagnosticService,
    //     "TELEGRAM_BOT",
    //   ],
    // },

    {
      provide: "USER_STATES_MAP",
      useValue: new Map<number, any>(),
    },
  ],
  exports: [
    // Exportar solo los servicios necesarios para otros módulos
    TelegramErrorHandler,
    TelegramDiagnosticService,
    OSMService,
    ClinicasVenezuelaService,
    TelegramBotService,

    // Exportar la instancia compartida del bot
    "TELEGRAM_BOT",

    // Nuevos servicios refactorizados
    TelegramBaseService,
    TelegramService,
    TelegramAIService,
    TelegramMenuService,
    TelegramLocationService,
    TelegramReminderService,

    // Exportar el servicio original para compatibilidad
    // OriginalTelegramService,
  ],
})
export class TelegramModule {}
