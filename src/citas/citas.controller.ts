import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  HttpException,
  HttpStatus,
  Logger,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { PaginationDto } from "src/Dto Pagination/Pagination";
import { Cita } from "src/Entities/Cita.entity";
import { CitasService } from "./citas.service";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";
import { RolesGuard } from "src/Guard/Guard";
import { UseGuards } from "@nestjs/common";
import { Roles } from "src/Entities/Usuarios.entity";
import { RequireRoles } from "src/Guard/Decorator";
import { GetUser } from "src/Guard/Get-User-Decorator";

interface citaInterface {
  status: number;
  mesagge: string;
  data: Cita;
}

@ApiTags("Citas")
@Controller("citas")
export class CitasController {
  private readonly logger = new Logger(CitasController.name);
  constructor(private readonly citasService: CitasService) {}
  @ApiOperation({ summary: "Crear Cita" })
  @ApiResponse({
    status: 200,
    description: "Cita creada correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Cita no creada",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
  @Post()
  async create(@Body() createCitaDto: CreateCitaDto): Promise<citaInterface> {
    try {
      const cita = await this.citasService.create(createCitaDto);
      return {
        status: 200,
        mesagge: "Cita creada exitosamente",
        data: cita,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST
        );
      }
    }
  }

  @ApiOperation({ summary: "Obtiene todas la Citas" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Citas obtenidas correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Citas no obtenidas",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
  @Get()
  async findAll(@Query() pagination: PaginationDto) {
    return await this.citasService.findAll(pagination);
  }

  @Get("getId/:citaId")
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
