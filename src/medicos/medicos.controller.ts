import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";

import { MedicosService } from "./medicos.service";
import { UpdateMedicoDto } from "./dto/update-medico.dto";
import { Medico } from "../Entities/Medico.entity";
import { CreateMedicoBodyDto } from "./dto/create-medico-body.dto";
import { PaginatedMedicosResponseDto } from "./dto/paginated-medicos-response.dto";
import { PaginatedResult } from "src/Dto Pagination/Pagination";
import { Usuario } from "src/Entities/Usuarios.entity";

@ApiTags("Medicos")
@Controller("medicos")
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Crear un nuevo médico" })
  @ApiBody({ type: CreateMedicoBodyDto })
  @ApiResponse({
    status: 201,
    description: "Médico creado correctamente.",
    type: Medico,
  })
  @ApiResponse({
    status: 400,
    description: "Error en los datos de entrada.",
  })
  @ApiResponse({ status: 409, description: "El médico o usuario ya existe." })
  async create(@Body() body: CreateMedicoBodyDto): Promise<Medico> {
    return this.medicosService.create(body.usuario, body.medico);
  }

  @ApiOperation({ summary: "Obtener todos los médicos de la aplicación" })
  @ApiResponse({
    status: 200,
    description: "Médicos obtenidos correctamente.",
    type: PaginatedMedicosResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Error al obtener los médicos",
  })
  @Get()
  async findAll(): Promise<PaginatedResult<Usuario>> {
    return this.medicosService.findAll();
  }

  @Patch(":medicoId")
  @ApiOperation({ summary: "Actualizar un médico" })
  @ApiParam({
    name: "medicoId",
    description: "ID del médico (UUID)",
    type: "string",
  })
  @ApiBody({ type: UpdateMedicoDto })
  @ApiResponse({
    status: 200,
    description: "Médico actualizado correctamente.",
    type: Medico,
  })
  @ApiResponse({ status: 404, description: "Médico no encontrado." })
  @ApiResponse({ status: 400, description: "Datos de entrada inválidos." })
  async update(
    @Param("medicoId", ParseUUIDPipe) medicoId: string,
    @Body() updateMedicoDto: UpdateMedicoDto
  ): Promise<Medico> {
    return this.medicosService.update(medicoId, updateMedicoDto);
  }

  @Delete(":medicoId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Eliminar un médico" })
  @ApiParam({
    name: "medicoId",
    description: "ID del médico (UUID)",
    type: "string",
  })
  @ApiResponse({
    status: 204,
    description: "Médico eliminado correctamente.",
  })
  @ApiResponse({ status: 404, description: "Médico no encontrado." })
  async remove(
    @Param("medicoId", ParseUUIDPipe) medicoId: string
  ): Promise<void> {
    await this.medicosService.remove(medicoId);
  }

  // @Get(":id")
  // findOne(@Param("id") id: string) {
  //   return this.medicosService.findOne(id);
  // }
}
