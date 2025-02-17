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
import { HistorialMedicoService } from "./historial-medico.service";
import { CreateHistorialMedicoDto } from "./dto/create-historial-medico.dto";
import { UpdateHistorialMedicoDto } from "./dto/update-historial-medico.dto";
import { HistorialMedico } from "../entities/HistorialMedico.entity";

interface respuestaInterface {
  status: number;
  message: string;
  data: any;
}

@Controller("historial-medico")
export class HistorialMedicoController {
  constructor(
    private readonly historialMedicoService: HistorialMedicoService
  ) {}

  @Post()
  async create(@Body() createHistorialMedicoDto: CreateHistorialMedicoDto) {
    const nuevoHistorialMedico = await this.historialMedicoService.create(
      createHistorialMedicoDto
    );
    return {
      message: "Historial médico creado exitosamente",
      historialMedico: nuevoHistorialMedico,
    };
  }

  @Get()
  findAll() {
    return this.historialMedicoService.findAll();
  }

  @Get("findOne/:id")
  async findOne(@Param("id") id: string): Promise<respuestaInterface> {
    try {
      const historialMedico = await this.historialMedicoService.findOne(id);
      return {
        status: 200,
        message: "Historial médico encontrado exitosamente",
        data: historialMedico,
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

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateHistorialMedicoDto: UpdateHistorialMedicoDto
  ) {
    return this.historialMedicoService.update(+id, updateHistorialMedicoDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.historialMedicoService.remove(+id);
  }
}
