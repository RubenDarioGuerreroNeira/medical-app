import { Module } from "@nestjs/common";
import { HistorialMedicoService } from "./historial-medico.service";
import { HistorialMedicoController } from "./historial-medico.controller";
import { Usuario } from "src/Entities/Usuarios.entity";
import { Medico } from "src/Entities/Medico.entity";
import { HistorialMedico } from "src/Entities/HistorialMedico.entity";
import { TypeOrmModule } from "@nestjs/typeorm";

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, Medico, HistorialMedico])],
  controllers: [HistorialMedicoController],
  providers: [HistorialMedicoService],
})
export class HistorialMedicoModule {}
