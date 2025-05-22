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



import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false // Prueba con false primero
  } : false,

  // --- OPCIÓN ADICIONAL: Usar la propiedad 'extra' ---
  // Esto pasa opciones directamente al driver PostgreSQL
  // Asegúrate de que `extra` solo se active en producción si es necesario
  extra: process.env.NODE_ENV === 'production' ? {
    ssl: {
      // El modo SSL, puede ser 'require' o 'no-verify' si rejectUnauthorized: false
      // Si rejectUnauthorized es false, 'no-verify' es equivalente y más explícito
      // Si la base de datos es de Render, es muy probable que necesite 'require'
      sslmode: 'require' // O 'no-verify' si rejectUnauthorized: false
    }
  } : {},
  // --- FIN DE LA OPCIÓN ADICIONAL ---

  entities: ['src/Entities/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],

  synchronize: false,
  logging: true,
});