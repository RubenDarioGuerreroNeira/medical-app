import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TelegramHistorialMedicoService } from './telegram-historial-medico.service';
import { TelegramHistorialMedicoController } from './telegram-historial-medico.controller';
import { TelegramHistorialMedico } from '../Entities/TelegramHistorialMedico.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([TelegramHistorialMedico]),
  ],
  controllers: [TelegramHistorialMedicoController],
  providers: [TelegramHistorialMedicoService],
  exports: [TelegramHistorialMedicoService],
})
export class TelegramHistorialMedicoModule {}