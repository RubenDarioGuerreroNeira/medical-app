import { Inject, Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";

// entidades
import { Usuario } from "./Entities/Usuarios.entity";
import { Medico } from "./Entities/Medico.entity";
import { Cita } from "./Entities/Cita.entity";
import { DocumentoConsulta } from "./Entities/DocumentoConsulta.entity";
import { HistorialMedico } from "./Entities/HistorialMedico.entity";
import { MedicationReminder } from "./Entities/MedicationReminder.entity";
import { RecetaMedica } from "./Entities/RecetaMedica.entity";
import { NotaMedica } from "./Entities/NotaMedica.entity";
import { MedicalAppointment } from "./Entities/MedicalAppointment.entity";
import { TelegramHistorialMedico } from "./Entities/TelegramHistorialMedico.entity";
import { EmergencyInfo } from "./Entities/EmergencyInfo.entity";

import { UsuariosModule } from "./usuarios/usuarios.module";
import { MedicosModule } from "./medicos/medicos.module";
import { CitasModule } from "./citas/citas.module";
import { HistorialMedicoModule } from "./historial-medico/historial-medico.module";
import { ConfigModule } from "@nestjs/config";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { ConfigService } from "@nestjs/config";
import { MailerModule } from "@nestjs-modules/mailer";
import { HandlebarsAdapter } from "@nestjs-modules/mailer/dist/adapters/handlebars.adapter";

import { NotaMedicaModule } from "./nota_medica/nota_medica.module";
import { RecetaMedicaModule } from "./receta-medica/receta-medica.module";
import { CacheModule } from "@nestjs/cache-manager";
import { TelegramModule } from "./telegram/telegram.module";

//graphQL
import { GraphQLModule } from "@nestjs/graphql";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { join } from "path";
import { AppResolver } from "./app.resolver";
import { ReminderResolver } from "./telegram/reminder.resolver";
// maneja el el archivo de certificacion ca.pem
import { caCert } from "./ssl-config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TelegramModule,
    CacheModule.register({
      ttl: 60000, // tiempo de vida en milisegundos
      max: 100, //max numero de items en cache
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "src/schema.gql"), // SIEMPRE genera el esquema
      sortSchema: false,
      playground: process.env.NODE_ENV !== "production", // Playground solo en desarrollo
      debug: process.env.NODE_ENV !== "production", // Debug solo en desarrollo
    }),

    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [
        Usuario,
        Medico,
        Cita,
        HistorialMedico,
        RecetaMedica,
        DocumentoConsulta,
        NotaMedica,
        MedicationReminder,
        MedicalAppointment,
        TelegramHistorialMedico,
        EmergencyInfo,
      ],
      synchronize: process.env.NODE_ENV !== "production",
      extra: {
        ssl:
          process.env.NODE_ENV === "production"
            ? {
                // configura ssl para aiven

                rejectUnauthorized: false,
                ca: caCert,
              }
            : undefined, // No SSL in development unless specifically configured
      },
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get("MAIL_HOST"),
          port: configService.get("MAIL_PORT"),
          secure: false,
          auth: {
            user: configService.get("MAIL_USER"),
            pass: configService.get("MAIL_PASS"),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get("MAIL_FROM")}>`,
          // from: `"configService.get("MAIL_FROM")`,
        },
        template: {
          dir: __dirname + "/templates",
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),

    UsuariosModule,
    MedicosModule,
    CitasModule,
    HistorialMedicoModule,
    CloudinaryModule,
    NotaMedicaModule,
    RecetaMedicaModule,
  ],
  controllers: [AppController],
  providers: [AppService, AppResolver, ReminderResolver],
})
export class AppModule {}
