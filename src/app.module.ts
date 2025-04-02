import { Inject, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from './Entities/usuarios.entity';
import { Medico } from './Entities/medico.entity';
import { Cita } from './Entities/cita.entity';
import { HistorialMedico } from './Entities/historialMedico.entity';
import { UsuariosModule } from './usuarios/usuarios.module';
import { MedicosModule } from './medicos/medicos.module';
import { CitasModule } from './citas/citas.module';
import { HistorialMedicoModule } from './historial-medico/historial-medico.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { NotaMedica } from './Entities/notaMedica.entity';
import { RecetaMedica } from './Entities/recetaMedica.entity';
import { DocumentoConsulta } from './Entities/documentoConsulta.entity.';
import { NotaMedicaModule } from './nota_medica/nota_medica.module';
import { RecetaMedicaModule } from './receta-medica/receta-medica.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TelegramModule } from './telegram/telegram.module';
import { MedicationReminder } from './Entities/reminder.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TelegramModule,
    CacheModule.register({
      ttl: 60000, // tiempo de vida en milisegundos
      max: 100, //max numero de items en cache
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST /*|| "localhost",*/,
      port: parseInt(process.env.DB_PORT) /* || 5432,*/,
      username: process.env.DB_USERNAME /* || "postgres",*/,
      password: process.env.DB_PASSWORD /* || "2980",*/,
      database: process.env.DB_NAME /* || "citas",*/,
      entities: [
        Usuario,
        Medico,
        Cita,
        HistorialMedico,
        RecetaMedica,
        DocumentoConsulta,
        NotaMedica,
        MedicationReminder,
      ],
      synchronize: process.env.NODE_ENV !== 'production',
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: configService.get('MAIL_PORT'),
          secure: false,
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"No Reply" <${configService.get('MAIL_FROM')}>`,
          // from: `"configService.get("MAIL_FROM")`,
        },
        template: {
          dir: __dirname + '/templates',
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
  providers: [AppService],
})
export class AppModule {}
