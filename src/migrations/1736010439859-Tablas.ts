import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1736010439859 implements MigrationInterface {
    name = 'Tablas1736010439859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medico" DROP COLUMN "especialidad"`);
        await queryRunner.query(`ALTER TABLE "historial_medico" ADD "medico_id" uuid`);
        await queryRunner.query(`ALTER TABLE "historial_medico" ADD CONSTRAINT "FK_0cdcf303e953de36fa604ed0d1c" FOREIGN KEY ("medico_id") REFERENCES "medico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "historial_medico" DROP CONSTRAINT "FK_0cdcf303e953de36fa604ed0d1c"`);
        await queryRunner.query(`ALTER TABLE "historial_medico" DROP COLUMN "medico_id"`);
        await queryRunner.query(`ALTER TABLE "medico" ADD "especialidad" character varying NOT NULL`);
    }

}
