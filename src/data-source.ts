import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import { caCert } from "./ssl-config";

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
        ? 
          {
            
            rejectUnauthorized: false,
            ca: caCert,
            
          }
        : undefined,
  },

  entities: ["src/Entities/*.entity{.ts,.js}"],
  migrations: ["src/migrations/*{.ts,.js}"],
  migrationsTableName: "migrations",
  schema: "public",

  synchronize: false,
  logging: true,
});
