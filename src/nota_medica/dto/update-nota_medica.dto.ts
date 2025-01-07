import { PartialType } from '@nestjs/mapped-types';
import { CreateNotaMedicaDto } from './create-nota_medica.dto';

export class UpdateNotaMedicaDto extends PartialType(CreateNotaMedicaDto) {}
