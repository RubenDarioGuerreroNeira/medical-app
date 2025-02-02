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
import { UpdateMedicoDto } from "./dto/update-medico.dto";
import { Medico } from "src/Entities/Medico.entity";

interface MedicoInterface {
  status: number;
  mesagge: string;
  data: Medico;
}
@ApiTags("Medicos")
@Controller("medicos")
export class MedicosController {
  constructor(private readonly medicosService: MedicosService) {}

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

  // @Get(":id")
  // findOne(@Param("id") id: string) {
  //   return this.medicosService.findOne(id);
  // }

  // @Patch(":id")
  // update(@Param("id") id: string, @Body() updateMedicoDto: UpdateMedicoDto) {
  //   return this.medicosService.update(+id, updateMedicoDto);
  // }

  // @Delete(":id")
  // remove(@Param("id") id: string) {
  //   return this.medicosService.remove(+id);
  // }
}
