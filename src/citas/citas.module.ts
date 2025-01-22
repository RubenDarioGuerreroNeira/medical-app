import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CitasController } from "./citas.controller";
import { CitasService } from "./citas.service";
import { Cita } from "../Entities/Cita.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { HistorialMedico } from "../Entities/HistorialMedico.entity";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { JwtAuthGuard } from "src/auth/Jwt-auth.guard";
import { RolesGuard } from "../Guard/Guard";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Cita, Usuario, Medico, HistorialMedico]),
    AuthModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET"),
        signOptions: {
          expiresIn: configService.get<string>("JWT_EXPIRATION") || "24h",
        },
      }),
    }),
  ],
  controllers: [CitasController],
  providers: [CitasService, JwtStrategy, RolesGuard, JwtAuthGuard],
  exports: [CitasService],
})
export class CitasModule {}

// import { Module } from '@nestjs/common';
// import { CitasService } from './citas.service';
// import { CitasController } from './citas.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Cita } from '../Entities/Cita.entity';
// import { Usuario } from '../Entities/Usuarios.entity';
// import { Medico } from '../Entities/Medico.entity';
// import { HistorialMedico } from '../Entities/HistorialMedico.entity';
// @Module({
//   imports: [TypeOrmModule.forFeature([Cita, Usuario, Medico, HistorialMedico])],
//   controllers: [CitasController],
//   providers: [CitasService],
// })
// export class CitasModule {}
