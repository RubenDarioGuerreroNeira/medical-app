import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1736124654916 implements MigrationInterface {
    name = 'Tablas1736124654916'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medico" ADD "numeroColegiado" character varying`);
        await queryRunner.query(`ALTER TABLE "medico" ADD CONSTRAINT "UQ_4f14d2587963152a86ba8a42fc0" UNIQUE ("numeroColegiado")`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "especialidad" character varying NOT NULL DEFAULT 'Indique la Especialidad'`);
        await queryRunner.query(`ALTER TABLE "medico" ADD CONSTRAINT "UQ_e29bf2c8be46b7e3622fb686f8b" UNIQUE ("especialidad")`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "fechaContratacion" date NOT NULL DEFAULT ('now'::text)::date`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "activo" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "fotoPerfil" character varying`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "certificaciones" text`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "idiomas" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "idiomas"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "certificaciones"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "fotoPerfil"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "activo"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "fechaContratacion"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP CONSTRAINT "UQ_e29bf2c8be46b7e3622fb686f8b"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "especialidad"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP CONSTRAINT "UQ_4f14d2587963152a86ba8a42fc0"`);
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "numeroColegiado"`);
    }

}
