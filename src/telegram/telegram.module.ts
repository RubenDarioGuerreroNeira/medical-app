import { Module, forwardRef } from "@nestjs/common";
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
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import { ReminderService } from "./reminder.service";
import { ReminderCommands } from "./reminder.commnads";
import { ScheduleModule } from "@nestjs/schedule";
import { SchedulerRegistry } from "@nestjs/schedule";
import { MedicationReminder } from "src/entities/reminder.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

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

// // telegram.module.ts
// import { Module } from "@nestjs/common";
// import { TelegramService } from "./telegram.service";
// import { TelegramController } from "./telegram.controller";
// import { ConfigModule } from "@nestjs/config";
// import { GeminiAIService } from "src/Gemini/gemini.service";
// import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
// import { TelegramLocationHandler } from "./telegram-location-handler.service";
// import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
// import { OSMService } from "./farmacias-maps.service";
// import { TelegramErrorHandler } from "./telegramErrorHandler.service";
// import { TelegramWebhookController } from "./telegramWebhook.controller";
// import { TelegramBotService } from "./telegramBotService.service";
// import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
// import { ReminderService } from "./reminder.service";
// import { ReminderCommands } from "./reminder.commnads";
// import { ScheduleModule } from "@nestjs/schedule";
// import { SchedulerRegistry } from "@nestjs/schedule";
// import { MedicationReminder } from "src/entities/reminder.entity";
// import { TypeOrmModule } from "@nestjs/typeorm";

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
//     SchedulerRegistry, // Asegúrate de que SchedulerRegistry esté incluido
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
