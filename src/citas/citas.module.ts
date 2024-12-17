import { Module } from '@nestjs/common';
import { CitasService } from './citas.service';
import { CitasController } from './citas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cita } from '../Entities/Cita.entity';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';
import { HistorialMedico } from '../Entities/HistorialMedico.entity';
@Module({
  imports: [TypeOrmModule.forFeature([Cita, Usuario, Medico, HistorialMedico])],
  controllers: [CitasController],
  providers: [CitasService],
})
export class CitasModule {}
