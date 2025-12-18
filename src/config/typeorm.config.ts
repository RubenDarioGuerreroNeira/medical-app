
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file for CLI usage
dotenv.config();

const caCert =
  process.env.NODE_ENV === 'production'
    ? fs.readFileSync(path.join(process.cwd(), 'ca.pem'))
    : undefined;

// This is the single source of truth for the database configuration.
export const typeOrmOptions: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsTableName: 'migrations',
  schema: 'public',
  // synchronize should be false in production and for migrations.
  // We let NestJS handle it in development via the app.module configuration.
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production', // log SQL queries in dev
  extra: {
    ssl:
      process.env.NODE_ENV === 'production'
        ? {
            // rejectUnauthorized: false, // This is a security risk and should be handled by providing the correct CA cert.
            ca: caCert,
          }
        : undefined,
  },
};

// This configuration is used by the NestJS application (app.module.ts)
// It uses ConfigService to inject dependencies and can have slightly different settings for runtime.
export const TypeOrmConfigAsync: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService): Promise<TypeOrmModuleOptions> => {
    return {
      ...typeOrmOptions,
      host: configService.get<string>('DB_HOST'),
      port: configService.get<number>('DB_PORT'),
      username: configService.get<string>('DB_USERNAME'),
      password: configService.get<string>('DB_PASSWORD'),
      database: configService.get<string>('DB_NAME'),
      // Enable synchronize only if NODE_ENV is not 'production'
      synchronize: configService.get<string>('NODE_ENV') !== 'production',
    };
  },
};

// This DataSource is used by the TypeORM CLI for migrations.
// It directly uses the typeOrmOptions.
export const AppDataSource = new DataSource(typeOrmOptions as DataSourceOptions);
