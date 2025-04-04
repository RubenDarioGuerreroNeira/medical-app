import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateMedicationReminderTable1743784190503
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Primero, verificamos si la columna type existe
    const hasTypeColumn = await queryRunner.hasColumn(
      'medication_reminder',
      'type',
    );
    if (!hasTypeColumn) {
      await queryRunner.query(`
                ALTER TABLE "medication_reminder"
                ADD COLUMN "type" character varying NOT NULL DEFAULT 'medication'
            `);
    }

    // Actualizamos los timestamps para usar timezone si no lo están usando
    await queryRunner.query(`
            ALTER TABLE "medication_reminder"
            ALTER COLUMN "createdAt" TYPE TIMESTAMP WITH TIME ZONE,
            ALTER COLUMN "updatedAt" TYPE TIMESTAMP WITH TIME ZONE
        `);

    // Aseguramos que updatedAt tenga un valor por defecto
    await queryRunner.query(`
            ALTER TABLE "medication_reminder"
            ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP
        `);

    // Crear el trigger para actualizar automáticamente updatedAt si no existe
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."updatedAt" = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        `);

    // Verificamos si el trigger ya existe antes de crearlo
    const triggerExists = await queryRunner.query(`
            SELECT 1 FROM pg_trigger 
            WHERE tgname = 'update_medication_reminder_updated_at'
        `);

    if (!triggerExists.length) {
      await queryRunner.query(`
                CREATE TRIGGER update_medication_reminder_updated_at
                    BEFORE UPDATE ON "medication_reminder"
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
            `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Solo eliminamos lo que agregamos, manteniendo los datos existentes
    const hasTypeColumn = await queryRunner.hasColumn(
      'medication_reminder',
      'type',
    );
    if (hasTypeColumn) {
      await queryRunner.query(`
                ALTER TABLE "medication_reminder" DROP COLUMN "type"
            `);
    }

    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_medication_reminder_updated_at ON "medication_reminder"`,
    );
    await queryRunner.query(`DROP FUNCTION IF EXISTS update_updated_at_column`);
  }
}
