import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHistorialMedicos1745000000000 implements MigrationInterface {
    name = 'CreateHistorialMedicos1745000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create historial_medicos table with base columns
        // Note: Foreign keys to usuario and medico are omitted because those tables
        // don't have migrations and may not exist in CI environment
        await queryRunner.query(`
            CREATE TABLE "historial_medicos" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "paciente_id" uuid,
                "medico_id" uuid,
                "descripcion" text NOT NULL,
                "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "diagnostico" character varying,
                "tratamiento" character varying,
                "datos_medicos" jsonb,
                CONSTRAINT "PK_historial_medicos" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "historial_medicos"`);
    }
}
