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
  providers: [CitasService, JwtStrategy, JwtAuthGuard],
  exports: [CitasService],
})
export class CitasModule {}
