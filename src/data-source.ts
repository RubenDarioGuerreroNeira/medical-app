import { Usuario } from './Entities/Usuarios.entity';
import { Medico } from './Entities/Medico.entity';
import { Cita } from './Entities/Cita.entity';
import { HistorialMedico } from './Entities/HistorialMedico.entity';
import { DocumentoConsulta } from './Entities/DocumentoConsulta.entity';
import { MedicationReminder } from './Entities/MedicationReminder.entity';
import { NotaMedica } from './Entities/NotaMedica.entity';
import { RecetaMedica } from './Entities/RecetaMedica.entity';
import { DataSource } from 'typeorm';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // entities: ["src/**/*.entity{.ts,.js}"],
  // entities: [
  //   Usuario,
  //   Medico,
  //   Cita,
  //   HistorialMedico,
  //   RecetaMedica,
  //   DocumentoConsulta,
  //   NotaMedica,
  //   MedicationReminder,
  // ],

  entities: [join(__dirname, '**', '*.entity.{ts,js}')],

  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
  logging: true,
});

// // src/data-source.ts
// import { DataSource } from "typeorm";
// import { join } from "path";

// export const AppDataSource = new DataSource({
//   type: "postgres", // o el tipo de base de datos que uses
//   host: "localhost",
//   port: 5432,
//   username: "postgres",
//   password: "2980",
//   database: "citas",
//   entities: ["src/**/*.entity{.ts,.js}"],
//   //   migrations: ["src/migrations/**/*{.ts,.js}"],
//   //   entities: [join(__dirname, "**", "*.entity.{ts,js}")],
//   migrations: [join(__dirname, "migrations", "*.{ts,js}")],
//   synchronize: false,
//   logging: true,
// });
