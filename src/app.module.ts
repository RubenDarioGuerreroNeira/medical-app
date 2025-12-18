import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';

// All entity imports are now handled by the glob pattern in typeorm.config.ts

import { UsuariosModule } from './usuarios/usuarios.module';
import { MedicosModule } from './medicos/medicos.module';
import { CitasModule } from './citas/citas.module';
import { HistorialMedicoModule } from './historial-medico/historial-medico.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';

import { NotaMedicaModule } from './nota_medica/nota_medica.module';
import { RecetaMedicaModule } from './receta-medica/receta-medica.module';
import { CacheModule } from '@nestjs/cache-manager';
import { TelegramModule } from './telegram/telegram.module';

// GraphQL
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppResolver } from './app.resolver';
import { ReminderResolver } from './telegram/reminder.resolver';

// Centralized TypeORM configuration
import { TypeOrmConfigAsync } from './config/typeorm.config';

// Middleware
import { LoggerMiddleware } from './common/middleware/logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TelegramModule,
    CacheModule.register({
      isGlobal: true,
      ttl: 60000,
      max: 100,
    }),

    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: false,
      playground: process.env.NODE_ENV !== 'production',
      debug: process.env.NODE_ENV !== 'production',
    }),

    TypeOrmModule.forRootAsync(TypeOrmConfigAsync),

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
  providers: [AppService, AppResolver, ReminderResolver],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
