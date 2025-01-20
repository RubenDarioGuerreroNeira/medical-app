import { ApiProperty, ApiQuery } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsDateString, IsUUID, IsOptional } from "class-validator";
import { PaginationDto } from "src/Dto Pagination/Pagination";

export class GetCitasRangoFechaDto extends PaginationDto {
  @ApiProperty({
    description: "Fecha inicial en formato ISO (YYYY-MM-DD)",
    required: true,
    type: Date,
  })
  @IsDateString()
  @Transform(({ value }) => {
    if (!value) {
      throw new Error("La fecha inicial es requerida");
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error("Formato de fecha inicial inválido");
    }
    return date;
  })
  fecha: Date;

  @ApiProperty({
    description: "Fecha final en formato ISO (YYYY-MM-DD)",
    required: true,
    type: Date,
  })
  @IsDateString()
  @Transform(({ value }) => {
    if (!value) {
      throw new Error("La fecha final es requerida");
    }
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error("Formato de fecha final inválido");
    }
    return date;
  })
  fechaFin: Date;

  @ApiProperty({
    description: "ID del médico",
    required: false,
    type: String,
  })
  @IsUUID()
  @IsOptional()
  medicoId: string;
}
