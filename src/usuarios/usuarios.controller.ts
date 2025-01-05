import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

import { UsuariosService } from "./usuarios.service";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";
import { LoginDto } from "./dto/login-dto";
import { Usuario } from "src/Entities/Usuarios.entity";

@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(":usuarioId")
  findOne(@Param("usuarioId") usuarioId: string) {
    return this.usuariosService.findOne(usuarioId);
  }

  @Patch("update/:usuarioId")
  update(
    @Param("usuarioId") usuarioId: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto
  ) {
    return this.usuariosService.update(usuarioId, updateUsuarioDto);
  }

  @Delete("delete/:usuarioId")
  remove(@Param("usuarioId") usuarioId: string) {
    return this.usuariosService.remove(usuarioId);
  }
  @Post("login")
  login(@Body() loginDto: LoginDto) {
    try {
      return this.usuariosService.login(loginDto);
    } catch (error) {}
  }

  @Post("recovery")
  async recovery(@Body() datos: CreateUsuarioDto): Promise<Partial<Usuario>> {
    try {
      const email = await this.usuariosService.recoveryUser(datos);
      return {
        email: email,
      } as Partial<Usuario>;
    } catch (error) {
      throw new HttpException("Error message", HttpStatus.BAD_REQUEST);
    }
  }

  @Post("restorePassword")
  async restorePassword(
    @Body() datos: CreateUsuarioDto
  ): Promise<Partial<Usuario>> {
    try {
      const email = await this.usuariosService.restorePassword(datos);
      return {
        email: email,
        contrasena: datos.contrasena,
      } as Partial<Usuario>;
    } catch (error) {
      throw new HttpException("Error message", HttpStatus.BAD_REQUEST);
    }
  }
}
