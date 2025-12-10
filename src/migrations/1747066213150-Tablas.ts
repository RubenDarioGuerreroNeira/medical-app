import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1747066213150 implements MigrationInterface {
    name = 'Tablas1747066213150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "emergency_info" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "allergies" text, "conditions" text, "emergencyContact" text, "accessCode" character varying(10), "isPublic" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_8e4d034d91b184f568cfddb7476" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "emergency_info"`);
    }

}
