import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1739651186183 implements MigrationInterface {
    name = 'Tablas1739651186183'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "medication_reminder" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "medicationName" character varying NOT NULL, "dosage" character varying NOT NULL, "reminderTime" TIME NOT NULL, "daysOfWeek" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_36e1a9287e54efb3dee1273e1d5" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "medication_reminder"`);
    }

}
