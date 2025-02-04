import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { HttpStatus, HttpException } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { MedicosService } from "./medicos.service";
import { CreateMedicoDto } from "./dto/create-medico.dto";
import { CreateUsuarioDto } from "src/usuarios/dto/create-usuario.dto";
import { UpdateMedicoDto } from "./dto/update-medico.dto";
import { Medico } from "src/Entities/Medico.entity";

interface MedicoInterface {
  status: number;
  mesagge: string;
  data: any;
}
@ApiTags("Medicos")
@Controller("medicos")
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

  @ApiOperation({ summary: "Crear un nuevo médico" })
  @ApiResponse({
    status: 200,
    description: "Médico creado correctamente",
    type: Medico,
  })
  @ApiResponse({
    status: 400,
    description: "Error al crear el médico",
  })
  @Post()
  async create(
    @Body() requestBody: { usuario: CreateUsuarioDto; medico: CreateMedicoDto }
  ) {
    try {
      const result = await this.medicosService.create(
        requestBody.usuario,
        requestBody.medico
      );
      return {
        status: 200,
        mesagge: "Médico creado correctamente",
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @ApiOperation({ summary: "Obtener todos los médicos de la aplicación" })
  @ApiResponse({
    status: 200,
    description: "Médicos obtenidos correctamente",
    type: Medico,
  })
  @ApiResponse({
    status: 400,
    description: "Error al obtener los médicos",
  })
  @Get()
  async findAll() {
    try {
      const result = await this.medicosService.findAll();
      return {
        status: 200,
        mesagge: "Medicos obtenidos correctamente",
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
  @Patch(":medicoId")
  async update(
    @Param("medicoId") medicoId: string,
    @Body() updateMedicoDto: UpdateMedicoDto
  ) {
    try {
      const result = await this.medicosService.update(
        medicoId,
        updateMedicoDto
      );
      return {
        status: 200,
        mesagge: "Médico actualizado correctamente",
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }

  @Delete(":medicoId")
  remove(@Param("medicoId") medicoId: string) {
    return this.medicosService.remove(medicoId);
  }

  // @Get(":id")
  // findOne(@Param("id") id: string) {
  //   return this.medicosService.findOne(id);
  // }
}
