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
import { PaginatedResult } from "src/Dto Pagination/Pagination";

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

  @ApiOperation({ summary: "Obtiene una Cita" })
  @ApiResponse({
    status: 200,
    description: "Cita obtenida correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Cita no obtenida",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
  @Get("getId/:citaId")
  findOneCita(@Param("citaId") citaId: string) {
    try {
      return this.citasService.findOneCita(citaId);
    } catch (error) {
      console.log(error);
    }
  }
  @ApiOperation({ summary: "Actualiza una Cita" })
  @ApiResponse({
    status: 200,
    description: "Cita actualizada correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Cita no actualizada",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
  @Patch("update/:citaId")
  update(
    @Param("citaId") citaId: string,
    @Body() updateCitaDto: UpdateCitaDto
  ) {
    return this.citasService.update(citaId, updateCitaDto);
  }

  @RequireRoles(Roles.ADMIN, Roles.MEDICO)
  @ApiOperation({ summary: "Cancelar Cita" })
  @ApiResponse({
    status: 200,
    description: "Cita cancelada correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Cita no cancelada",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
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

  @ApiOperation({ summary: "Elimina una Cita" })
  @ApiResponse({
    status: 200,
    description: "Cita eliminada correctamente",
    type: Cita,
  })
  @ApiResponse({
    status: 400,
    description: "Cita no eliminada",
  })
  @ApiResponse({
    status: 500,
    description: "Error en el Servidor",
  })
  @Delete("delete/:citaId")
  remove(@Param("citaId") citaId: string) {
    return this.citasService.remove(citaId);
  }

  @ApiOperation({ summary: "Obtiene todas las Citas de un Usuario" })
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
  @Get("cancela/:citaId")
  async cancelarCita(
    @Param("citaId") citaId: string,
    @Body("userId") userId: string
  ) {
    try {
      return await this.citasService.cancelar(citaId, userId);
    } catch (error) {
      console.log(error);
    }
  }

  @ApiOperation({ summary: "Obtiene todas las Citas de un Médico" })
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

  // citas de un medico Paginado
  @Get("citasMedico/:medicoId")
  async citasList(
    @Param("medicoId") medicoId: string,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      const citas = await this.citasService.citasporMedico(
        medicoId,
        paginationDto
      );
      return citas;
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

  @ApiOperation({ summary: "Obtiene todas las Citas de un Médico por fecha" })
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
  @Get("citasMedico/:medicoId")
  async citaMedicoFecha(
    @Param() medicoId: string,
    @Query() fecha: Date,
    @Query() paginationDto: PaginationDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      const bMedicoFecha = await this.citasService.citadDelDiDeterminado(
        fecha,
        medicoId,
        paginationDto
      );
      return bMedicoFecha;
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
}
