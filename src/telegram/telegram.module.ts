// import { Module, forwardRef } from '@nestjs/common';
// import { TelegramService } from './telegram.service';
// import { TelegramController } from './telegram.controller';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { GeminiAIService } from 'src/Gemini/gemini.service';
// import { ClinicasVenezuelaService } from './centros-hospitalarios.service';
// import { TelegramLocationHandler } from './telegram-location-handler.service';
// import { TelegramMessageFormatter } from './telegramMessageFormatter.service';
// import { OSMService } from './farmacias-maps.service';
// import { TelegramErrorHandler } from './telegramErrorHandler.service';
// import { TelegramWebhookController } from './telegramWebhook.controller';
// import { TelegramBotService } from './telegramBotService.service';
// import { TelegramDiagnosticService } from './telegramDiagnosticService.service';
// import { ReminderService } from './reminder.service';
// import { ReminderCommands } from './reminder.commnads';
// import { ScheduleModule } from '@nestjs/schedule';
// import { SchedulerRegistry } from '@nestjs/schedule';
// import { MedicationReminder } from '../Entities/MedicationReminder.entity';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { TelegramNotificationService } from './telegramNotificationService.service';
// import { ReminderService as ServiceReminder } from './reminder.service';
// import * as TelegramBot from 'node-telegram-bot-api';
// // import {MedicationReminder} from "../Entities/reminder.entity";

// @Module({
//   imports: [
//     ConfigModule.forRoot(),
//     TypeOrmModule.forFeature([MedicationReminder]),
//     ScheduleModule.forRoot(),
//   ],
//   providers: [
//     GeminiAIService,
//     ClinicasVenezuelaService,
//     TelegramLocationHandler,
//     TelegramMessageFormatter,
//     OSMService,
//     TelegramErrorHandler,
//     TelegramBotService,
//     TelegramDiagnosticService,
//     ReminderCommands,
//     SchedulerRegistry,
//     TelegramNotificationService,
//     ServiceReminder,
//     {
//       provide: 'TELEGRAM_BOT',
//       useFactory: async (configService: ConfigService) => {
//         const token = configService.get<string>('TELEGRAM_BOT_TOKEN');
//         return new TelegramBot(token, { polling: false });
//       },
//       inject: [ConfigService],
//     },

//     {
//       provide: 'USER_STATES_MAP', // Proveer el Map como un valor
//       useValue: new Map<number, any>(),
//     },
//     {
//       provide: ReminderService,
//       useClass: ReminderService,
//     },
//     {
//       provide: TelegramService,
//       useClass: TelegramService,
//     },
//   ],
//   controllers: [TelegramController, TelegramWebhookController],
//   exports: [TelegramService, TelegramBotService],
// })
// export class TelegramModule {}

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
