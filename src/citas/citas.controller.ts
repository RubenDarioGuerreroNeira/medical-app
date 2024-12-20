import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { CitasService } from "./citas.service";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";

@Controller("citas")
export class CitasController {
  constructor(private readonly citasService: CitasService) {}

  @Post()
  create(@Body() createCitaDto: CreateCitaDto) {
    try {
      return this.citasService.create(createCitaDto);
    } catch (error) {
      console.log(error);
    }
  }

  @Get()
  findAll() {
    return this.citasService.findAll();
  }

  @Get("getall/:citaId")
  findOne(@Param("citaId") citaId: string) {
    try {
      return this.citasService.findOne(citaId);
    } catch (error) {
      console.log(error);
    }
  }

  @Patch("update/:citaId")
  update(
    @Param("citaId") citaId: string,
    @Body() updateCitaDto: UpdateCitaDto
  ) {
    return this.citasService.update(citaId, updateCitaDto);
  }

  @Delete("delete/:citaId")
  remove(@Param("citaId") citaId: string) {
    return this.citasService.remove(citaId);
  }
}
