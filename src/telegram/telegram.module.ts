import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule, SchedulerRegistry } from "@nestjs/schedule";
import * as TelegramBot from "node-telegram-bot-api";

// Controladores
import { TelegramController } from "./telegram.controller";
import { TelegramWebhookController } from "./telegramWebhook.controller";

// Entidades
import { MedicationReminder } from "../Entities/MedicationReminder.entity";
import { MedicalAppointment } from "src/Entities/MedicalAppointment.entity";
import { TelegramHistorialMedico } from "../Entities/TelegramHistorialMedico.entity";
import { EmergencyInfo } from "src/Entities/EmergencyInfo.entity";

// Servicios de utilidad que se mantienen
import { GeminiAIService } from "src/Gemini/gemini.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import { OSMService } from "./farmacias-maps.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { TelegramBotService } from "./telegramBotService.service";

// Nuevos servicios refactorizados
import { TelegramBaseService } from "./services/telegram-base.service";
import { TelegramAIService } from "./services/telegram-ai.service";
import { TelegramMenuService } from "./services/telegram-menu.service";
import { TelegramLocationService } from "./services/telegram-location.service";
import { TelegramReminderService } from "./services/telegram-reminder.service";
import { TelegramService } from "./services/telegram.service";
import { TelegramNotificationService } from "./telegramNotificationService.service";
import { Repository } from "typeorm";
import { ReminderService } from "./reminder.service";
import { TelegramContactService } from "./services/telegram-contact.service";
import { TelegramLabResultsService } from "./services/telegram-lab-results.service";
import { EmergencyInfoService } from "./services/emergency-info.service";

// apis
import { HealthCentersService } from "./colombia/api-servicios-medicos-colombia.service";
import { HttpModule } from "@nestjs/axios";
import { TelegramColombiaService } from "./colombia/telegram-colombia.service";
import { AppointmentCommands } from "./services/appointment.commands.service";
import { AppointmentService } from "./services/appointment.service";

// Importar el nuevo servicio y módulo
import { TelegramHistorialMedicoService } from "./services/telegram-historial-medico.service";
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
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    TelegramHistorialMedicoModule,
  ],
  controllers: [TelegramController, TelegramWebhookController],
  providers: [
    // Servicios de utilidad
    GeminiAIService,
    TelegramErrorHandler,
    TelegramDiagnosticService,
    SchedulerRegistry,
    OSMService,
    ClinicasVenezuelaService,
    TelegramNotificationService,
    HealthCentersService,
    TelegramColombiaService,
    AppointmentCommands,
    TelegramService,
    TelegramLabResultsService, // <-- Agrega aquí

    TelegramHistorialMedicoService,
    // AppointmentService,
    EmergencyInfoService, // <-- Agrega aquí

    {
      provide: "TELEGRAM_BOT",
      useFactory: (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
        if (!token) {
          throw new Error(
            "TELEGRAM_BOT_TOKEN no está definido en las variables de entorno"
          );
        }
        return new TelegramBot(token, { polling: true });
      },
      inject: [ConfigService],
    },

    {
      provide: "USER_STATES_MAP",
      useValue: new Map<number, any>(),
    },

    // Proveer TelegramBotService
    TelegramBotService,

    // Nuevos servicios refactorizados
    TelegramBaseService,
    TelegramAIService,
    TelegramMenuService,
    TelegramLocationService,
    TelegramReminderService,
    TelegramContactService, // Agregar el servicio aquí

    // Primero registrar ReminderService como un servicio normal
    {
      provide: ReminderService,
      useFactory: (
        reminderRepo: Repository<MedicationReminder>,
        schedulerRegistry: SchedulerRegistry,
        notificationService: TelegramNotificationService,
        bot: TelegramBot
      ) => {
        return new ReminderService(
          reminderRepo,
          schedulerRegistry,
          null, // Pasamos null inicialmente para TelegramService
          notificationService,
          bot
        );
      },
      inject: [
        getRepositoryToken(MedicationReminder),
        SchedulerRegistry,
        TelegramNotificationService,
        "TELEGRAM_BOT",
      ],
    },

    // Definir TelegramReminderService con la inyección correcta de ReminderService
    {
      provide: TelegramReminderService,
      useFactory: (
        bot: TelegramBot,
        userStatesMap: Map<number, any>,
        reminderService: ReminderService,
        historialMedicoService: TelegramHistorialMedicoService
      ) => {
        const service = new TelegramReminderService(
          bot,
          userStatesMap,
          reminderService,
          historialMedicoService
        );

        // Verificar que reminderService es la instancia correcta
        console.log(
          "ReminderService instance type:",
          reminderService.constructor.name
        );

        return service;
      },
      inject: [
        "TELEGRAM_BOT",
        "USER_STATES_MAP",
        ReminderService, // Inyectar directamente ReminderService, no el repositorio
        TelegramHistorialMedicoService, // Inyectar el servicio aquí
      ],
    },

    // Modificar la configuración de AppointmentCommands
    {
      provide: AppointmentCommands,
      useFactory: (
        appointmentService: AppointmentService,
        bot: TelegramBot,
        userSatesMap: Map<number, any>
      ) => {
        return new AppointmentCommands(appointmentService, bot, userSatesMap);
      },
      inject: [AppointmentService, "TELEGRAM_BOT", "USER_STATES_MAP"],
    },

    // Asegúrate de que AppointmentService esté configurado correctamente
    {
      provide: AppointmentService,
      useFactory: (
        appointmentRepo: Repository<MedicalAppointment>,
        schedulerRegistry: SchedulerRegistry,
        telegramService,
        notificationService: TelegramNotificationService,
        bot: TelegramBot
      ) => {
        return new AppointmentService(
          appointmentRepo,
          schedulerRegistry,
          telegramService,
          notificationService,
          bot
        );
      },
      inject: [
        getRepositoryToken(MedicalAppointment),
        SchedulerRegistry,
        TelegramNotificationService,
        "TELEGRAM_BOT",
      ],
    },

    // Definir TelegramService y establecer la referencia circular
    {
      provide: TelegramService,
      useFactory: (
        configService: ConfigService,
        menuService: TelegramMenuService,
        aiService: TelegramAIService,
        locationService: TelegramLocationService,
        reminderService: TelegramReminderService,
        errorHandler: TelegramErrorHandler,
        diagnosticService: TelegramDiagnosticService,
        contactService: TelegramContactService,
        historialMedicoService: TelegramHistorialMedicoService,
        labResultsService: TelegramLabResultsService, // <-- Agrega aquí

        // colombiaService: TelegramColombiaService,
        appointmentCommands: AppointmentCommands,
        userStates: Map<number, any>,
        bot: TelegramBot,
        emergencyInfoService: EmergencyInfoService // <-- Agrega aquí
      ) => {
        const service = new TelegramService(
          configService,
          menuService,
          aiService,
          locationService,
          reminderService,
          errorHandler,
          diagnosticService,
          contactService,
          historialMedicoService,
          labResultsService, // <-- Y pásalo aquí
          // null,

          // colombiaService,
          appointmentCommands,
          // telegramHistorialMedicoService,
          userStates,
          bot,
          emergencyInfoService // <-- Y pásalo aquí
        );

        return service;
      },
      inject: [
        ConfigService,
        TelegramMenuService,
        TelegramAIService,
        TelegramLocationService,
        TelegramReminderService,
        TelegramErrorHandler,
        TelegramDiagnosticService,
        TelegramContactService,
        TelegramHistorialMedicoService,
        TelegramLabResultsService, // <-- Agrega aquí
        // TelegramColombiaService,
        AppointmentCommands,
        "USER_STATES_MAP",
        "TELEGRAM_BOT",
        EmergencyInfoService, // <-- Agrega aquí
      ],
    },
  ],
  exports: [
    TelegramService,
    TelegramReminderService,
    "TELEGRAM_BOT",
    TelegramBotService,
    ReminderService,
    TelegramContactService, // Exportar el servicio si es necesario
    HealthCentersService,
    TelegramColombiaService,
    AppointmentCommands,
    AppointmentService,
    TelegramHistorialMedicoService,
    EmergencyInfoService, // <-- Agrega aquí
  ],
})
export class TelegramModule {}
