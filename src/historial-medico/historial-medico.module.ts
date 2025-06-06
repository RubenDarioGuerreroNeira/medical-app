import { Module } from '@nestjs/common';
import { HistorialMedicoService } from './historial-medico.service';
import { HistorialMedicoController } from './historial-medico.controller';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';
import { HistorialMedico } from 'src/Entities/HistorialMedico.entity';
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
