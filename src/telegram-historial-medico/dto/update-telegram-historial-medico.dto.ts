import { PartialType } from '@nestjs/mapped-types';
import { CreateTelegramHistorialMedicoDto } from './create-telegram-historial-medico.dto';

export class UpdateTelegramHistorialMedicoDto extends PartialType(CreateTelegramHistorialMedicoDto) {}