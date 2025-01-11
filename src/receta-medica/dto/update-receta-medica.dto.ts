import { PartialType } from '@nestjs/mapped-types';
import { CreateRecetaMedicaDto } from './create-receta-medica.dto';

export class UpdateRecetaMedicaDto extends PartialType(CreateRecetaMedicaDto) {}
