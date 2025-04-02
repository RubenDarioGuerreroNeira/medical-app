import { Module } from '@nestjs/common';
import { HistorialMedicoService } from './historial-medico.service';
import { HistorialMedicoController } from './historial-medico.controller';
import { Usuario } from '../Entities/usuarios.entity';
import { Medico } from '../Entities/medico.entity';
import { HistorialMedico } from 'src/Entities/historialMedico.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, Medico, HistorialMedico]),
    CacheModule.register({
      ttl: 60000, // tiempo de vida en milisegundos
      max: 100, //max numero de items en cache
    }),
  ],
  controllers: [HistorialMedicoController],
  providers: [HistorialMedicoService],
  exports: [HistorialMedicoService],
})
export class HistorialMedicoModule {}
