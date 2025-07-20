import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  ParseUUIDPipe,
} from "@nestjs/common";
import { Request } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { UsuariosService } from "./usuarios.service";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";
import { Roles, Usuario } from "../Entities/Usuarios.entity";
import { JwtAuthGuard } from "../auth/Jwt-auth.guard";
import { UseGuards, Req } from "@nestjs/common";
import { RequireRoles } from "../Guard/Decorator";
import { PaginatedUsuariosResponseDto } from "./dto/paginated-usuarios-response.dto";
import { PaginatedResult } from "src/Dto Pagination/Pagination";

@ApiTags("Usuarios")
@Controller("usuarios")
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @ApiOperation({ summary: "Crear Usuario" })
  @ApiBody({ type: CreateUsuarioDto })
  @ApiResponse({
    status: 201,
    description: "Usuario creado correctamente.",
    type: Usuario,
  })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos." })
  @ApiResponse({ status: 409, description: "El correo electrónico ya existe." })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    return this.usuariosService.create(createUsuarioDto);
  }

  @ApiOperation({ summary: "Obtener todos los Usuarios" })
  @ApiResponse({
    status: 200,
    description: "Lista de usuarios obtenida correctamente.",
    type: PaginatedUsuariosResponseDto,
  })
  // @UseGuards(JwtAuthGuard) // Descomentar si solo los usuarios autenticados pueden ver la lista
  // @RequireRoles(Roles.ADMIN)
  @Get()
  findAll(): Promise<PaginatedResult<Usuario>> {
    return this.usuariosService.findAll();
  }

  @ApiOperation({ summary: "Obtener un Usuario por ID" })
  @ApiResponse({
    status: 200,
    description: "Usuario obtenido correctamente.",
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  // @UseGuards(JwtAuthGuard) // Descomentar si es una ruta protegida
  @Get(":id")
  findOne(@Param("id", ParseUUIDPipe) usuarioId: string): Promise<Usuario> {
    return this.usuariosService.findOne(usuarioId);
  }

  @ApiOperation({ summary: "Actualizar Usuario" })
  @ApiBody({ type: UpdateUsuarioDto })
  @ApiResponse({
    status: 200,
    description: "Usuario actualizado correctamente.",
    type: Usuario,
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  @ApiResponse({ status: 403, description: "No autorizado." })
  @ApiResponse({
    status: 409,
    description: "Conflicto de datos (ej. email duplicado).",
  })
  @UseGuards(JwtAuthGuard)
  @RequireRoles(Roles.PACIENTE)
  @Patch(":id")
  update(
    @Param("id", ParseUUIDPipe) usuarioId: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @Req() req: Request // Inyectamos el objeto Request de Express
  ): Promise<Usuario> {
    // El objeto 'req.user' es añadido por JwtAuthGuard.
    // Gracias a la extensión de tipos, TypeScript ahora lo reconoce sin errores.
    return this.usuariosService.update(usuarioId, updateUsuarioDto, req.user);
  }

  @ApiOperation({ summary: "Eliminar Usuario" })
  @ApiResponse({
    status: 204,
    description: "Usuario eliminado correctamente.",
  })
  @ApiResponse({ status: 404, description: "Usuario no encontrado." })
  @ApiResponse({ status: 403, description: "No autorizado." })
  @UseGuards(JwtAuthGuard)
  @RequireRoles(Roles.ADMIN)
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("id", ParseUUIDPipe) usuarioId: string): Promise<void> {
    return this.usuariosService.remove(usuarioId);
  }
}
