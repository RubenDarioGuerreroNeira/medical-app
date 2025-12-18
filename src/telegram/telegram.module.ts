import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import * as TelegramBot from "node-telegram-bot-api";
import { HttpModule } from "@nestjs/axios";

// --- ENTITIES ---
import { MedicationReminder } from "../Entities/MedicationReminder.entity";
import { MedicalAppointment } from "../Entities/MedicalAppointment.entity";
import { TelegramHistorialMedico } from "../Entities/TelegramHistorialMedico.entity";
import { EmergencyInfo } from "../Entities/EmergencyInfo.entity";

// --- CONTROLLERS ---
import { TelegramController } from "./telegram.controller";
import { TelegramWebhookController } from "./telegramWebhook.controller";

// --- REFACTORED SERVICES ---
import { TelegramService } from "./services/telegram.service";
import { TelegramBaseService } from "./services/telegram-base.service";
import { TelegramMenuService } from "./services/telegram-menu.service";
import { TelegramAIService } from "./services/telegram-ai.service";
import { TelegramLocationService } from "./services/telegram-location.service";
import { TelegramReminderService } from "./services/telegram-reminder.service";
import { TelegramContactService } from "./services/telegram-contact.service";
import { TelegramLabResultsService } from "./services/telegram-lab-results.service";
import { EmergencyInfoService } from "./services/emergency-info.service";
import { AppointmentCommands } from "./services/appointment.commands.service";
import { AppointmentService } from "./services/appointment.service";
import { TelegramHistorialMedicoService } from "./services/telegram-historial-medico.service";

// --- UTILITY & EXTERNAL SERVICES ---
import { GeminiAIService } from "src/Gemini/gemini.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import { OSMService } from "./farmacias-maps.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramNotificationService } from "./telegramNotificationService.service";
import { ReminderService } from "./reminder.service";
import { ReminderResolver } from "./reminder.resolver";
import { HealthCentersService } from "./colombia/api-servicios-medicos-colombia.service";
import { TelegramColombiaService } from "./colombia/telegram-colombia.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
import { TelegramBotService } from "./telegramBotService.service";

// --- OTHER MODULES ---
import { TelegramHistorialMedicoModule } from "../telegram-historial-medico/telegram-historial-medico.module";


@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      MedicationReminder,
      MedicalAppointment,
      TelegramHistorialMedico,
      EmergencyInfo,
    ]),
    ScheduleModule.forRoot(),
    HttpModule,
    TelegramHistorialMedicoModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    // --- BOT INSTANCE ---
    {
      provide: "TELEGRAM_BOT",
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
        if (!token) {
          throw new Error("TELEGRAM_BOT_TOKEN no está definido en las variables de entorno");
        }
        return new TelegramBot(token, { polling: true });
      },
      inject: [ConfigService],
    },
    // --- USER STATE MAP ---
    {
      provide: "USER_STATES_MAP",
      useValue: new Map<number, any>(),
    },
    
    // --- REFACTORED SERVICES ---
    // These should be plain providers, Nest will resolve the dependency tree.
    TelegramService,
    TelegramBaseService,
    TelegramMenuService,
    TelegramAIService,
    TelegramLocationService,
    TelegramReminderService,
    TelegramContactService,
    TelegramLabResultsService,
    EmergencyInfoService,
    AppointmentCommands,
    AppointmentService,
    TelegramHistorialMedicoService,

    // --- UTILITY & EXTERNAL SERVICES ---
    GeminiAIService,
    TelegramErrorHandler,
    TelegramDiagnosticService,
    SchedulerRegistry,
    OSMService,
    ClinicasVenezuelaService,
    TelegramNotificationService,
    ReminderService,
    HealthCentersService,
    TelegramColombiaService,
    TelegramMessageFormatter, // Ensure this is provided
    TelegramBotService,
    ReminderResolver,  ],
  exports: [
    "TELEGRAM_BOT",
    TelegramService,
  ],
})
export class TelegramModule {}