import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1746028839546 implements MigrationInterface {
    name = 'Tablas1746028839546'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "telegram_historial_medico" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "diagnostico" character varying NOT NULL, "tratamiento" character varying, "descripcion" text, "nombreMedico" character varying, "especialidadMedico" character varying, "centroMedico" character varying, "condicionesCronicas" jsonb, "alergias" jsonb, "grupoSanguineo" character varying, "esCompartible" boolean NOT NULL DEFAULT false, "fechaConsulta" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b431d06cc109604028184b6f7f" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "telegram_historial_medico"`);
    }

}
