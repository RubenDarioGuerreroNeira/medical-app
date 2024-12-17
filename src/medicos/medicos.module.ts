import { Module } from '@nestjs/common';
import { MedicosService } from './medicos.service';
import { MedicosController } from './medicos.controller';

@Module({
  controllers: [MedicosController],
  providers: [MedicosService],
})
export class MedicosModule {}
