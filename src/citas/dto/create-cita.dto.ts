import { IsDateString, IsEnum, IsUUID } from "class-validator";

enum EstadoCita {
    CONFIRMADA = "confirmada",
    CANCELADA = "cancelada",
    COMPLETADA = "completada",
  }


export class CreateCitaDto {
    @IsUUID()
    pacienteId: string;
  
    @IsUUID()
    medicoId: string;
  
    @IsDateString()
    fechaHora: Date;
  }
  
  export class UpdateEstadoDto {
    @IsEnum(EstadoCita)
    estado: EstadoCita;
  }