// import { DataSource } from 'typeorm';
// import * as dotenv from 'dotenv';

// dotenv.config();

// export const AppDataSource = new DataSource({
//   type: 'postgres',
//   host: process.env.DB_HOST,
//   port: parseInt(process.env.DB_PORT),
//   username: process.env.DB_USERNAME,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,

//  // --- COMIENZO DE LA CONFIGURACIÓN SSL CONDICIONAL ---
//   ssl: process.env.NODE_ENV === 'production' ? {
//     rejectUnauthorized: false // Importante: Lee la nota abajo sobre rejectUnauthorized
//     // Si Render proporciona un CA certificado específico o lo descargas,
//     // puedes usarlo aquí: ca: fs.readFileSync('./path/to/your/ca-certificate.crt').toString(),
//   } : false, // En desarrollo (NODE_ENV != 'production'), no usa SSL

//   entities: ['src/Entities/*.entity{.ts,.js}'],
//   migrations: ['src/migrations/*{.ts,.js}'],

//   synchronize: false,
//   logging: true,
// });

import { DataSource } from "typeorm";
import * as dotenv from "dotenv";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  extra: {
    ssl:
      process.env.NODE_ENV === "production"
        ? {
            rejectUnauthorized: false,
          }
        : undefined,
  },

  entities: ["src/Entities/*.entity{.ts,.js}"],
  migrations: ["src/migrations/*{.ts,.js}"],
  // entities: ["dist/**/*.entity{.ts,.js}"],
  // migrations: ["dist/migrations/*{.ts,.js}"],

  synchronize: false,
  logging: true,
});
