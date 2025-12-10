import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1744978079098 implements MigrationInterface {
    name = 'Tablas1744978079098'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "medical_appointment" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "doctorName" character varying NOT NULL, "specialty" character varying NOT NULL, "appointmentDate" TIMESTAMP NOT NULL, "appointmentTime" TIME NOT NULL, "medicalCenterName" character varying NOT NULL, "medicalCenterLocation" character varying, "phoneNumber" character varying, "notes" character varying, "isActive" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'appointment', "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_f7ee623b3a9d3a58537dd0f45b7" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "medical_appointment"`);
    }

}
