import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTypeToMedicationReminder1739677865391
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Paso 1: Agregar la columna permitiendo NULL inicialmente
    await queryRunner.query(`
            ALTER TABLE "medication_reminder" 
            ADD COLUMN "type" character varying
        `);

    // Paso 2: Actualizar los registros existentes con un valor por defecto
    await queryRunner.query(`
            UPDATE "medication_reminder" 
            SET "type" = 'medication' 
            WHERE "type" IS NULL
        `);

    // Paso 3: Hacer la columna NOT NULL después de actualizarla
    await queryRunner.query(`
            ALTER TABLE "medication_reminder" 
            ALTER COLUMN "type" SET NOT NULL
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE "medication_reminder" 
            DROP COLUMN "type"
        `);
  }
}
