import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialTables1743784190502 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE "medication_reminder" (
                "id" SERIAL PRIMARY KEY,
                "userId" BIGINT NOT NULL,
                "chatId" BIGINT NOT NULL,
                "medicationName" character varying NOT NULL,
                "dosage" character varying NOT NULL,
                "reminderTime" TIME NOT NULL,
                "daysOfWeek" integer[] NOT NULL,
                "isActive" boolean NOT NULL DEFAULT true,
                "timezone" character varying NOT NULL,
                "type" character varying NOT NULL DEFAULT 'medication',
                "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

    // Crear un trigger para actualizar automáticamente updatedAt
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

    await queryRunner.query(`
            CREATE TRIGGER update_medication_reminder_updated_at
                BEFORE UPDATE ON "medication_reminder"
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar el trigger primero
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_medication_reminder_updated_at ON "medication_reminder"`,
    );
    // Eliminar la función
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
    // Finalmente eliminar la tabla
    await queryRunner.query(`DROP TABLE IF EXISTS "medication_reminder"`);
  }
}
