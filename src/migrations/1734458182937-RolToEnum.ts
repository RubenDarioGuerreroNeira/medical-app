import { MigrationInterface, QueryRunner } from "typeorm";

export class RolToEnum1734458182937 implements MigrationInterface {
    name = 'RolToEnum1734458182937'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "rol"`);
        await queryRunner.query(`CREATE TYPE "public"."usuario_rol_enum" AS ENUM('admin', 'medico', 'paciente')`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD "rol" "public"."usuario_rol_enum" NOT NULL DEFAULT 'paciente'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "usuario" DROP COLUMN "rol"`);
        await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum"`);
        await queryRunner.query(`ALTER TABLE "usuario" ADD "rol" character varying NOT NULL`);
    }

}
