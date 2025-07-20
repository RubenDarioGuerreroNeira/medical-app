import { ApiProperty } from "@nestjs/swagger";
import { Usuario } from "../../Entities/Usuarios.entity";

class MetaDto {
  @ApiProperty({ example: 100, description: "Total de elementos" })
  total: number;

  @ApiProperty({ example: 1, description: "Página actual" })
  page: number;

  @ApiProperty({ example: 10, description: "Límite de elementos por página" })
  limit: number;

  @ApiProperty({ example: 10, description: "Total de páginas" })
  totalPages: number;

  @ApiProperty({
    example: true,
    description: "Indica si hay una página siguiente",
  })
  hasNextPage: boolean;

  @ApiProperty({
    example: false,
    description: "Indica si hay una página anterior",
  })
  hasPreviousPage: boolean;
}

export class PaginatedUsuariosResponseDto {
  @ApiProperty({ type: [Usuario] })
  data: Usuario[];

  @ApiProperty({ type: () => MetaDto })
  meta: MetaDto;
}
