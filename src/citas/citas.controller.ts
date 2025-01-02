import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
} from "@nestjs/common";

import { CitasService } from "./citas.service";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";
import { RolesGuard } from "src/Guard/Guard";
import { UseGuards } from "@nestjs/common";
import { Roles } from "src/Entities/Usuarios.entity";
import { RequireRoles } from "src/Guard/Decorator";
import { GetUser } from "src/Guard/Get-User-Decorator";

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
  findOneCita(@Param("citaId") citaId: string) {
    try {
      return this.citasService.findOneCita(citaId);
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

  @RequireRoles(Roles.ADMIN, Roles.MEDICO)
  @Patch("cancelar/:citaId")
  async cancelar(
    @Param("citaId") citaId: string,
    // no necesito pasar el id por body porque lo tomo del inicio de sesion 
    @GetUser("id") userId: string
  ) {
    try {
      return await this.citasService.cancelarCita(citaId, userId);
    } catch (error) {
      console.log(error);
    }
  }

  @Delete("delete/:citaId")
  remove(@Param("citaId") citaId: string) {
    return this.citasService.remove(citaId);
  }
}
