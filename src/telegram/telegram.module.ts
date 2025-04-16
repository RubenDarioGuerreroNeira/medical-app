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

// apis
import { HealthCentersService } from "./colombia/api-servicios-medicos-colombia.service";
import { HttpModule } from "@nestjs/axios";
import { TelegramColombiaService } from "./colombia/telegram-colombia.service";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([MedicationReminder]),
    ScheduleModule.forRoot(),
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
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

    // Centralizar la creación del bot
    {
      provide: "TELEGRAM_BOT",
      useFactory: async (configService: ConfigService) => {
        const token = configService.get<string>("TELEGRAM_BOT_TOKEN");
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
        reminderService: ReminderService
      ) => {
        const service = new TelegramReminderService(
          bot,
          userStatesMap,
          reminderService
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
        colombiaService: TelegramColombiaService,
        userStates: Map<number, any>,
        bot: TelegramBot,
        reminderServiceInstance: ReminderService
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
          colombiaService,
          userStates,
          bot
        );

        // Establecer la referencia circular manualmente
        if (reminderServiceInstance) {
          reminderServiceInstance["telegramService"] = service;
        }

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
        TelegramColombiaService,
        "USER_STATES_MAP",
        "TELEGRAM_BOT",
        ReminderService,
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
  ],
})
export class TelegramModule {}
