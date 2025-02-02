import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MedicosService } from "./medicos.service";
import { MedicosController } from "./medicos.controller";
import { Medico } from "src/Entities/Medico.entity";
import { Usuario } from "src/Entities/Usuarios.entity";
import { CacheModule } from "@nestjs/cache-manager";

@Module({
  imports: [
    TypeOrmModule.forFeature([Medico, Usuario]),
    CacheModule.register({
      ttl: 60000, // tiempo de vida en milisegundos
      max: 100, //max numero de items en cache
    }),
  ],
  controllers: [MedicosController],
  providers: [MedicosService],
})
export class MedicosModule {}
