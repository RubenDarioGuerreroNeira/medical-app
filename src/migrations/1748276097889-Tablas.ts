import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1748276097889 implements MigrationInterface {
    name = 'Tablas1748276097889'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emergency_info" ADD "tieneSeguro" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "emergency_info" ADD "seguro" character varying(100)`);
        await queryRunner.query(`CREATE TYPE "public"."emergency_info_bloodtype_enum" AS ENUM('A', 'B', 'AB', 'O')`);
        await queryRunner.query(`ALTER TABLE "emergency_info" ADD "bloodType" "public"."emergency_info_bloodtype_enum"`);
        await queryRunner.query(`CREATE TYPE "public"."emergency_info_rhfactor_enum" AS ENUM('Positivo', 'Negativo')`);
        await queryRunner.query(`ALTER TABLE "emergency_info" ADD "rhFactor" "public"."emergency_info_rhfactor_enum"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "emergency_info" DROP COLUMN "rhFactor"`);
        await queryRunner.query(`DROP TYPE "public"."emergency_info_rhfactor_enum"`);
        await queryRunner.query(`ALTER TABLE "emergency_info" DROP COLUMN "bloodType"`);
        await queryRunner.query(`DROP TYPE "public"."emergency_info_bloodtype_enum"`);
        await queryRunner.query(`ALTER TABLE "emergency_info" DROP COLUMN "seguro"`);
        await queryRunner.query(`ALTER TABLE "emergency_info" DROP COLUMN "tieneSeguro"`);
    }

}
