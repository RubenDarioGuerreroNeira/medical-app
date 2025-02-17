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
  BadRequestException,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";

import { Cita } from "src/entities/Cita.entity";
import { CitasService } from "./citas.service";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";
import { RolesGuard } from "src/Guard/Guard";
import { UseGuards } from "@nestjs/common";
import { Roles } from "src/entities/Usuarios.entity";
import { RequireRoles } from "src/Guard/Decorator";
import { GetUser } from "src/Guard/Get-User-Decorator";
import { PaginatedResult } from "src/Dto Pagination/Pagination";
import { PaginationDto } from "src/Dto Pagination/Pagination";
import { GetCitasRangoFechaDto } from "src/Dto Pagination/getCitasRangoFecha";
import { AuthService } from "src/auth/auth.service";
import { JwtAuthGuard } from "src/auth/Jwt-auth.guard";

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
  // @UseGuards(RolesGuard)
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
  @UseGuards(JwtAuthGuard)
  @RequireRoles(Roles.ADMIN)
  @Delete("delete/:citaId")
  async remove(@Param("citaId", ParseUUIDPipe) citaId: string) {
    try {
      const result = await this.citasService.remove(citaId);
      return {
        status: HttpStatus.OK,
        message: "Cita eliminada exitosamente",
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
  @ApiParam({
    name: "medicoId",
    description: "Identificador del médico",
    type: String,
  })
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
  @ApiOperation({ summary: "Obtener citas de un medico por fecha" })
  @ApiResponse({
    status: 200,
    description: "Citas obtenidas",
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

  @ApiOperation({ summary: "Obtener citas del Médico en un Rango de Fechas " })
  @ApiParam({
    name: "medicoId",
    description: "Identificador del médico",
    type: String,
  })
  @ApiParam({
    name: "Fecha",
    description: "desde la Fecha",
    type: Date,
  })
  @ApiParam({
    name: "FechaFin",
    description: "Hasta la Fecha:",
    type: Date,
  })
  @ApiResponse({
    description: "Devuelve una lista de citas del día actual",
    type: Cita,
  })
  @Get("/citasRangoFecha/:medicoId")
  @ApiOperation({ summary: "Obtener citas de un médico en un rango de fechas" })
  async getCitasPorRangoFecha(
    @Param("medicoId", ParseUUIDPipe) medicoId: string,
    @Query() query: GetCitasRangoFechaDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      const { fecha, fechaFin } = query;

      if (!fecha || !fechaFin) {
        throw new BadRequestException("Las fechas son requeridas");
      }

      const fechaInicio = new Date(fecha);
      const fechaFinal = new Date(fechaFin);

      if (fechaInicio > fechaFinal) {
        throw new BadRequestException(
          "La fecha final debe ser mayor a la fecha inicial"
        );
      }

      return await this.citasService.citadMedicoRangoFechas(medicoId, query);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: error.message,
          },
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: "Error interno del servidor",
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
  @ApiOperation({
    summary: "Reprograma una Cita de un médico para un paciente.",
  })
  @ApiParam({
    name: "citaId",
    description: "Identificador del médico",
    type: String,
  })
  @ApiParam({
    name: "userId",
    description: "Identificador del paciente",
    type: String,
  })
  @ApiParam({
    name: "fecha_hora",
    description: "Fecha de la cita",
    type: Date,
  })
  @Patch("reprograma/:citaId/:userId")
  async reprogramaCita(
    @Param("citaId") citaId: string,
    @Param("userId") userId: string,
    @Body() updateCitaDto: UpdateCitaDto
  ): Promise<citaInterface> {
    try {
      const { fecha_hora } = updateCitaDto;
      const citaReprogramada = await this.citasService.reprogramarCita(
        citaId,
        userId,
        updateCitaDto
      );
      return {
        status: 200,
        mesagge: "Cita reprogramada exitosamente",
        data: citaReprogramada,
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
}
