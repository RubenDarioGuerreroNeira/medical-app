import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1792720799881 implements MigrationInterface {
  name = 'InitialSchema1792720799881';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "historial_medicos" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "descripcion" text NOT NULL, "fecha_creacion" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "diagnostico" character varying, "tratamiento" character varying, "datos_medicos" jsonb, "condiciones_cronicas" jsonb, "alergias" jsonb, "grupo_sanguineo" character varying, "resumen_compartible" character varying, "es_compartible" boolean NOT NULL DEFAULT false, "paciente_id" uuid, "medico_id" uuid, CONSTRAINT "PK_4acd118532aa73eb84f8c1ea0d0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medico" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "numeroColegiado" character varying, "especialidad" character varying NOT NULL DEFAULT 'Indique la Especialidad', "fechaContratacion" date NOT NULL DEFAULT ('now'::text)::date, "activo" boolean NOT NULL DEFAULT true, "fotoPerfil" character varying, "certificaciones" text, "idiomas" text, "horario_disponible" jsonb NOT NULL, "usuario_id" uuid, CONSTRAINT "UQ_4f14d2587963152a86ba8a42fc0" UNIQUE ("numeroColegiado"), CONSTRAINT "UQ_e29bf2c8be46b7e3622fb686f8b" UNIQUE ("especialidad"), CONSTRAINT "REL_fa5cd1b5a4c9a5da0c358e92c1" UNIQUE ("usuario_id"), CONSTRAINT "PK_ddc7f4354b3a5098b58a28df187" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "receta_medica" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "medicamentos" text NOT NULL, "indicaciones" text NOT NULL, "fecha_emision" TIMESTAMP NOT NULL, "archivo_url" character varying, "cita_id" uuid, CONSTRAINT "PK_0547b19ff725e3eed67ee542405" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "nota_medica" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "contenido" text NOT NULL, "fecha_creacion" TIMESTAMP NOT NULL, "es_privada" boolean NOT NULL DEFAULT true, "cita_id" uuid, CONSTRAINT "PK_5ff0fc1766d3c29ffc448cb2893" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."cita_estado_enum" AS ENUM('confirmada', 'cancelada', 'completada')`,
    );
    await queryRunner.query(
      `CREATE TABLE "cita" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fecha_hora" TIMESTAMP NOT NULL, "estado" "public"."cita_estado_enum" NOT NULL, "paciente_id" uuid, "medico_id" uuid, CONSTRAINT "PK_57e1373661f0c185987b03dc6c8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."usuario_rol_enum" AS ENUM('admin', 'medico', 'paciente')`,
    );
    await queryRunner.query(
      `CREATE TABLE "usuario" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre" character varying NOT NULL, "apellido" character varying NOT NULL, "fecha_nacimiento" date NOT NULL, "genero" character varying NOT NULL, "direccion" character varying NOT NULL, "telefonoCelular" character varying NOT NULL, "telefonoContacto" character varying NOT NULL, "email" character varying NOT NULL, "contrasena" character varying NOT NULL, "rol" "public"."usuario_rol_enum" NOT NULL DEFAULT 'paciente', CONSTRAINT "UQ_2863682842e688ca198eb25c124" UNIQUE ("email"), CONSTRAINT "PK_a56c58e5cabaa04fb2c98d2d7e2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "telegram_historial_medico" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "diagnostico" character varying NOT NULL, "tratamiento" character varying, "descripcion" text, "nombreMedico" character varying, "especialidadMedico" character varying, "centroMedico" character varying, "condicionesCronicas" jsonb, "alergias" jsonb, "grupoSanguineo" character varying, "esCompartible" boolean NOT NULL DEFAULT false, "fechaConsulta" TIMESTAMP NOT NULL DEFAULT now(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6b431d06cc109604028184b6f7f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medication_reminder" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "medicationName" character varying NOT NULL, "dosage" character varying NOT NULL, "reminderTime" TIME NOT NULL, "daysOfWeek" text NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL, "type" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, "lastTaken" TIMESTAMP, "timesTaken" text DEFAULT '{}', CONSTRAINT "PK_36e1a9287e54efb3dee1273e1d5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_appointment" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "doctorName" character varying NOT NULL, "specialty" character varying NOT NULL, "appointmentDate" TIMESTAMP NOT NULL, "appointmentTime" TIME NOT NULL, "medicalCenterName" character varying NOT NULL, "medicalCenterLocation" character varying, "phoneNumber" character varying, "notes" character varying, "isActive" boolean NOT NULL DEFAULT true, "timezone" character varying NOT NULL, "type" character varying NOT NULL DEFAULT 'appointment', "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP, CONSTRAINT "PK_f7ee623b3a9d3a58537dd0f45b7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."emergency_info_bloodtype_enum" AS ENUM('A', 'B', 'AB', 'O')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."emergency_info_rhfactor_enum" AS ENUM('Positivo', 'Negativo')`,
    );
    await queryRunner.query(
      `CREATE TABLE "emergency_info" ("id" SERIAL NOT NULL, "userId" bigint NOT NULL, "chatId" bigint NOT NULL, "allergies" text, "conditions" text, "emergencyContact" text, "accessCode" character varying(10), "isPublic" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "tieneSeguro" boolean NOT NULL DEFAULT false, "seguro" character varying(100), "bloodType" "public"."emergency_info_bloodtype_enum", "rhFactor" "public"."emergency_info_rhfactor_enum", CONSTRAINT "PK_8e4d034d91b184f568cfddb7476" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "documento_consultas" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "nombre_archivo" character varying NOT NULL, "tipo_documento" character varying NOT NULL, "url_archivo" character varying NOT NULL, "fecha_subida" TIMESTAMP NOT NULL, "cita_id" uuid, CONSTRAINT "PK_5551f29d155b58fbd862acd0b4f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_medicos" ADD CONSTRAINT "FK_ffc3a6996545c147259870c75f4" FOREIGN KEY ("paciente_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_medicos" ADD CONSTRAINT "FK_8bc1cc410cf2b644dd54b9cea29" FOREIGN KEY ("medico_id") REFERENCES "medico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medico" ADD CONSTRAINT "FK_fa5cd1b5a4c9a5da0c358e92c1c" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "receta_medica" ADD CONSTRAINT "FK_930f4875c976845d4d12416c580" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "nota_medica" ADD CONSTRAINT "FK_9813ec8e43b422620e5f6335337" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cita" ADD CONSTRAINT "FK_573dda8b0ff6310f71cb31de2be" FOREIGN KEY ("paciente_id") REFERENCES "usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cita" ADD CONSTRAINT "FK_e921678f82163cec1f69ce789a4" FOREIGN KEY ("medico_id") REFERENCES "medico"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "documento_consultas" ADD CONSTRAINT "FK_f9fc88f1e60652e9ec4bf0fa959" FOREIGN KEY ("cita_id") REFERENCES "cita"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documento_consultas" DROP CONSTRAINT "FK_f9fc88f1e60652e9ec4bf0fa959"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cita" DROP CONSTRAINT "FK_e921678f82163cec1f69ce789a4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cita" DROP CONSTRAINT "FK_573dda8b0ff6310f71cb31de2be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "nota_medica" DROP CONSTRAINT "FK_9813ec8e43b422620e5f6335337"`,
    );
    await queryRunner.query(
      `ALTER TABLE "receta_medica" DROP CONSTRAINT "FK_930f4875c976845d4d12416c580"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medico" DROP CONSTRAINT "FK_fa5cd1b5a4c9a5da0c358e92c1c"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_medicos" DROP CONSTRAINT "FK_8bc1cc410cf2b644dd54b9cea29"`,
    );
    await queryRunner.query(
      `ALTER TABLE "historial_medicos" DROP CONSTRAINT "FK_ffc3a6996545c147259870c75f4"`,
    );
    await queryRunner.query(`DROP TABLE "documento_consultas"`);
    await queryRunner.query(`DROP TABLE "emergency_info"`);
    await queryRunner.query(
      `DROP TYPE "public"."emergency_info_rhfactor_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."emergency_info_bloodtype_enum"`,
    );
    await queryRunner.query(`DROP TABLE "medical_appointment"`);
    await queryRunner.query(`DROP TABLE "medication_reminder"`);
    await queryRunner.query(`DROP TABLE "telegram_historial_medico"`);
    await queryRunner.query(`DROP TABLE "usuario"`);
    await queryRunner.query(`DROP TYPE "public"."usuario_rol_enum"`);
    await queryRunner.query(`DROP TABLE "cita"`);
    await queryRunner.query(`DROP TYPE "public"."cita_estado_enum"`);
    await queryRunner.query(`DROP TABLE "nota_medica"`);
    await queryRunner.query(`DROP TABLE "receta_medica"`);
    await queryRunner.query(`DROP TABLE "medico"`);
    await queryRunner.query(`DROP TABLE "historial_medicos"`);
  }
}
