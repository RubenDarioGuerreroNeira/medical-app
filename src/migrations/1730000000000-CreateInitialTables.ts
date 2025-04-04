import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1743784190502 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Comando SQL para crear la tabla medication_reminder
    // Asegúrate de que los tipos de datos coincidan exactamente con tu entidad
    // NOTA: La columna 'type' NO se incluye aquí porque la migración 1739677865391 la añade después.
    await queryRunner.query(`
            CREATE TABLE "medication_reminder" (
                "id" SERIAL PRIMARY KEY,
                "userId" BIGINT NOT NULL,
                "chatId" BIGINT NOT NULL,
                "medicationName" character varying NOT NULL,
                "dosage" character varying NOT NULL,
                "reminderTime" TIME NOT NULL,
                "daysOfWeek" integer array NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "timezone" character varying NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP
            )
        `);
    // Puedes añadir aquí otros comandos CREATE TABLE para otras tablas iniciales si es necesario
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Comando SQL para eliminar la tabla medication_reminder
    await queryRunner.query(`
            DROP TABLE "medication_reminder"
        `);
    // Añade aquí comandos DROP TABLE para otras tablas que hayas creado en 'up'
  }
}
