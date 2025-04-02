import { Module } from '@nestjs/common';
import { RecetaMedica } from '../Entities/RecetaMedica.entity';
import { Cita } from '../Entities/Cita.entity';
import { RecetaMedicaService } from './receta-medica.service';
import { RecetaMedicaController } from './receta-medica.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Module({
  imports: [TypeOrmModule.forFeature([RecetaMedica, Cita])],
  controllers: [RecetaMedicaController],
  providers: [RecetaMedicaService, CloudinaryService],
})
export class RecetaMedicaModule {}
