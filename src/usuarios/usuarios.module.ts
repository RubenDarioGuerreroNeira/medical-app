import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "../Entities/Usuarios.entity";
import { UsuariosService } from "./usuarios.service";
import { MailerModule, MailerService } from "@nestjs-modules/mailer";
import { UsuariosController } from "./usuarios.controller";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    // ConfigModule,
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
