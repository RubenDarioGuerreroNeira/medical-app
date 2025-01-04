import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { HistorialMedicoService } from "./historial-medico.service";
import { CreateHistorialMedicoDto } from "./dto/create-historial-medico.dto";
import { UpdateHistorialMedicoDto } from "./dto/update-historial-medico.dto";

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

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.historialMedicoService.findOne(+id);
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
