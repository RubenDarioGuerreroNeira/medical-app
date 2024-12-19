import { MigrationInterface, QueryRunner } from "typeorm";

export class Tablas1734580128875 implements MigrationInterface {
    name = 'Tablas1734580128875'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "receta_medica" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "medicamentos" text NOT NULL, "indicaciones" text NOT NULL, "fecha_emision" TIMESTAMP NOT NULL, "archivo_url" character varying, "cita_id" uuid, CONSTRAINT "PK_0547b19ff725e3eed67ee542405" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "nota_medica" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contenido" text NOT NULL, "fecha_creacion" TIMESTAMP NOT NULL, "es_privada" boolean NOT NULL DEFAULT true, "cita_id" uuid, CONSTRAINT "PK_5ff0fc1766d3c29ffc448cb2893" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "documento_consulta" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre_archivo" character varying NOT NULL, "tipo_documento" character varying NOT NULL, "url_archivo" character varying NOT NULL, "fecha_subida" TIMESTAMP NOT NULL, "cita_id" uuid, CONSTRAINT "PK_527439303a40776206b0b40e2ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "receta_medica" ADD CONSTRAINT "FK_930f4875c976845d4d12416c580" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "nota_medica" ADD CONSTRAINT "FK_9813ec8e43b422620e5f6335337" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "documento_consulta" ADD CONSTRAINT "FK_cadf5a9bc103d88804fac10ab95" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "documento_consulta" DROP CONSTRAINT "FK_cadf5a9bc103d88804fac10ab95"`);
        await queryRunner.query(`ALTER TABLE "nota_medica" DROP CONSTRAINT "FK_9813ec8e43b422620e5f6335337"`);
        await queryRunner.query(`ALTER TABLE "receta_medica" DROP CONSTRAINT "FK_930f4875c976845d4d12416c580"`);
        await queryRunner.query(`DROP TABLE "documento_consulta"`);
        await queryRunner.query(`DROP TABLE "nota_medica"`);
        await queryRunner.query(`DROP TABLE "receta_medica"`);
    }

}
