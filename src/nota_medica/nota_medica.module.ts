import { Module } from "@nestjs/common";
import { NotaMedicaService } from "./nota_medica.service";
import { NotaMedicaController } from "./nota_medica.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotaMedica } from "../Entities/NotaMedica";

@Module({
  imports: [TypeOrmModule.forFeature([NotaMedica])],
  controllers: [NotaMedicaController],
  providers: [NotaMedicaService],
  exports: [NotaMedicaService],
})
export class NotaMedicaModule {}
