import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../Entities/Usuarios.entity";
import { UsuariosService } from "./usuarios.service";
import { MailerModule, MailerService } from "@nestjs-modules/mailer";
import { UsuariosController } from "./usuarios.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MailerService as MailServicio } from "src/Mail/mailService";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    // ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET"),
        signOptions: { expiresIn: "1d" },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService, MailServicio],
})
export class UsuariosModule {}
