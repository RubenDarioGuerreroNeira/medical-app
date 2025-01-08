import { IsDate, IsString, isUUID, IsBoolean, IsUUID } from "class-validator";

export class CreateNotaMedicaDto {
  @IsUUID()
  id?: string;

  @IsString()
  contenido: string;

  @IsDate()
  fecha_creacion: Date;

  @IsBoolean()
  es_privada: boolean;

  @IsString()
  cita_id: string;
}
