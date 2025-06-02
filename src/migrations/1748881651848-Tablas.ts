import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1748881651848 implements MigrationInterface {
    name = 'Tablas1748881651848'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_reminder" ADD "timesTaken" text DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_reminder" DROP COLUMN "timesTaken"`);
    }

}
