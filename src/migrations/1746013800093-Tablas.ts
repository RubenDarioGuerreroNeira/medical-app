import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1746013800093 implements MigrationInterface {
    name = 'Tablas1746013800093'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "historial_medicos" ADD "condiciones_cronicas" jsonb`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" ADD "alergias" jsonb`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" ADD "grupo_sanguineo" character varying`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" ADD "resumen_compartible" character varying`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" ADD "es_compartible" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "historial_medicos" DROP COLUMN "es_compartible"`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" DROP COLUMN "resumen_compartible"`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" DROP COLUMN "grupo_sanguineo"`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" DROP COLUMN "alergias"`);
        await queryRunner.query(`ALTER TABLE "historial_medicos" DROP COLUMN "condiciones_cronicas"`);
    }

}
