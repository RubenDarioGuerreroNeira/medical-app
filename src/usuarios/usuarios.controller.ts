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
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ApiQuery, ApiParam } from "@nestjs/swagger";
import { UsuariosService } from "./usuarios.service";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";
import { LoginDto } from "./dto/login-dto";
import { Roles, Usuario } from "../entities/Usuarios.entity";
import { JwtAuthGuard } from "../auth/Jwt-auth.guard";
import { UseGuards } from "@nestjs/common";
import { RequireRoles } from "../Guard/Decorator";

@ApiTags("Usuarios")
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: "Crear Usuario" })
  @ApiResponse({
    status: 200,
    description: "Usuario creado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no creado",
  })
  @Post()
  create(@Body() createUsuarioDto: CreateUsuarioDto) {
    return this.usuariosService.create(createUsuarioDto);
  }
  @ApiOperation({ summary: "Obtener todos los Usuarios" })
  @ApiResponse({
    status: 200,
    description: "Usuarios obtenidos correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuarios no obtenidos",
  })
  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @ApiOperation({ summary: "Obtener un Usuario" })
  @ApiResponse({
    status: 200,
    description: "Usuario obtenido correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no obtenido",
  })
  @Get("usuarioId/:usuarioId")
  findOne(@Param("usuarioId") usuarioId: string) {
    return this.usuariosService.findOne(usuarioId);
  }

  @ApiOperation({ summary: "Actualizar Usuario" })
  @ApiResponse({
    status: 200,
    description: "Usuario actualizado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no actualizado",
  })
  @UseGuards(JwtAuthGuard)
  @RequireRoles(Roles.PACIENTE)
  @Patch("update/:usuarioId")
  update(
    @Param("usuarioId") usuarioId: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto
  ) {
    return this.usuariosService.update(usuarioId, updateUsuarioDto);
  }
  @ApiOperation({ summary: "Eliminar Usuario" })
  @ApiResponse({
    status: 200,
    description: "Usuario eliminado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no eliminado",
  })
  @UseGuards(JwtAuthGuard)
  @RequireRoles(Roles.ADMIN)
  @Delete("delete/:usuarioId")
  remove(@Param("usuarioId") usuarioId: string) {
    return this.usuariosService.remove(usuarioId);
  }

  @ApiOperation({ summary: "Login" })
  @ApiResponse({
    status: 200,
    description: "Usuario logueado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no logueado",
  })
  @Post("login")
  login(@Body() loginDto: LoginDto) {
    try {
      return this.usuariosService.login(loginDto);
    } catch (error) {}
  }

  @ApiOperation({ summary: "Recuperar contraseña" })
  @ApiResponse({
    status: 200,
    description: "Usuario recuperado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no recuperado",
  })
  @Post("recovery")
  async recovery(@Body() datos: CreateUsuarioDto): Promise<Partial<Usuario>> {
    try {
      const email = await this.usuariosService.recoveryUser(datos);
      return {
        email: email,
      } as Partial<Usuario>;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Error message", HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Restaurar contraseña" })
  @ApiResponse({
    status: 200,
    description: "Usuario restaurado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Usuario no restaurado",
  })
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
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException("Error message", HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Generar token" })
  @ApiResponse({
    status: 200,
    description: "Token generado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Token no generado",
  })
  @Post("token")
  async generateToken(@Body() email: string, rol: Roles): Promise<any> {
    try {
      const token = await this.usuariosService.generateToken(email, rol);
      return token;
    } catch (error) {
      throw new HttpException("Error message", HttpStatus.BAD_REQUEST);
    }
  }

  @ApiOperation({ summary: "Decodificar token" })
  @ApiResponse({
    status: 200,
    description: "Token decodificado correctamente",
    type: Usuario,
  })
  @ApiResponse({
    status: 400,
    description: "Token no decodificado",
  })
  @Post("decodeToken")
  async decodeToken(@Body() body: { token: string }): Promise<any> {
    try {
      const decodedToken = await this.usuariosService.decodeToken(body.token);
      return decodedToken;
    } catch (error) {
      throw new HttpException(
        error.message || "Error message",
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
