import { IsDateString, IsEnum, IsUUID } from "class-validator";

enum EstadoCita {
  CONFIRMADA = "confirmada",
  CANCELADA = "cancelada",
  COMPLETADA = "completada",
}

export class CreateCitaDto {
  @IsUUID()
  id?: string;

  @IsUUID()
  paciente_id: string;

  @IsUUID()
  medico_id: string;

  @IsDateString()
  fecha_hora: Date;
}

export class UpdateEstadoDto {
  @IsEnum(EstadoCita)
  estado: EstadoCita;
}
