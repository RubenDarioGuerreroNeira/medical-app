import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastTakenToMedicationReminder1744978079099 implements MigrationInterface {
    name = 'AddLastTakenToMedicationReminder1744978079099'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_reminder" ADD "lastTaken" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "medication_reminder" DROP COLUMN "lastTaken"`);
    }
}