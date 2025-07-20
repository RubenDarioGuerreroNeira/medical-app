import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { CreateUsuarioDto } from 'src/usuarios/dto/create-usuario.dto';
import { CreateMedicoDto } from './create-medico.dto';

export class CreateMedicoBodyDto {
  @ApiProperty({ type: () => CreateUsuarioDto })
  @ValidateNested()
  @Type(() => CreateUsuarioDto)
  usuario: CreateUsuarioDto;

  @ApiProperty({ type: () => CreateMedicoDto })
  @ValidateNested()
  @Type(() => CreateMedicoDto)
  medico: CreateMedicoDto;
}