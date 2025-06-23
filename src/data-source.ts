import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import * as fs from "fs";
import { join } from "path";

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
        ? // process.env.DB_SSL_ENABLED === "true"
          {
            // rejectUnauthorized: true,
            rejectUnauthorized: false,
            // ca: fs.readFileSync(join(process.cwd(), "ca.pem")).toString(),
            ca: fs.readFileSync(join(process.cwd(), "ca.pem")),
          }
        : undefined,
  },

  entities: ["src/Entities/*.entity{.ts,.js}"],
  migrations: ["src/migrations/*{.ts,.js}"],

  synchronize: false,
  logging: true,
});
