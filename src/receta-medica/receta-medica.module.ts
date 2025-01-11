import { Module } from '@nestjs/common';
import { RecetaMedicaService } from './receta-medica.service';
import { RecetaMedicaController } from './receta-medica.controller';

@Module({
  controllers: [RecetaMedicaController],
  providers: [RecetaMedicaService],
})
export class RecetaMedicaModule {}
