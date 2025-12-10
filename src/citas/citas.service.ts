import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";
import { HttpException, HttpStatus } from "@nestjs/common";

import { Cita } from "../Entities/Cita.entity";
import { EstadoCita } from "../Entities/Cita.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { HistorialMedico } from "../Entities/HistorialMedico.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto, PaginatedResult } from "../Dto Pagination/Pagination";
import { isMainThread } from "worker_threads";
import { GetCitasRangoFechaDto } from "../Dto Pagination/getCitasRangoFecha";
import { Cache } from "cache-manager";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject } from "@nestjs/common";
import { log } from "console";

@Injectable()
export class CitasService {
  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,

    @InjectRepository(Cita)
    private citasRepository: Repository<Cita>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Medico)
    private medicoRepository: Repository<Medico>,
    @InjectRepository(HistorialMedico)
    private historialMedicoRepository: Repository<HistorialMedico>
  ) { }

  async verificaMedico(medico_id: string): Promise<Medico> {
    try {
      const medico = await this.medicoRepository.findOne({
        where: { id: medico_id },
      });

      if (!medico) {
        throw new BadRequestException("Médico no encontrado");
      }
      return medico;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Error al Verificar Disponibilidad de la Cita"
      );
    }
  }

  async verificaCita(datosCita: CreateCitaDto): Promise<void> {
    const fechaCita = new Date(datosCita.fecha_hora);
    const fechaActual = new Date();

    if (fechaCita.getTime() <= fechaActual.getTime()) {
      throw new BadRequestException(
        "La fecha y hora de la cita debe ser mayor a la fecha actual"
      );
    }

    try {
      const bCita = await this.citasRepository.findOne({
        where: {
          fecha_hora: datosCita.fecha_hora,
          medico: { id: datosCita.medico_id },
        },
        relations: ["medico"],
      });
      if (bCita) {
        throw new BadRequestException("Cita ya Existe");
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        "Error al Verificar Disponibilidad de la Cita"
      );
    }
  }

  async create(createCitaDto: CreateCitaDto) {
    try {
      const medico = await this.verificaMedico(createCitaDto.medico_id);

      const paciente = await this.usuarioRepository.findOne({
        where: { id: createCitaDto.paciente_id, rol: Roles.PACIENTE },
      });
      if (!paciente) {
        throw new BadRequestException("El paciente no existe");
      }

      await this.verificaCita(createCitaDto);

      const cita = this.citasRepository.create({
        paciente,
        medico,
        fecha_hora: createCitaDto.fecha_hora,
        estado: EstadoCita.CONFIRMADA,
      });

      await this.citasRepository.save(cita);
      return cita;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Cita>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    const [data, total] = await this.citasRepository.findAndCount({
      skip,
      take: limit,
      relations: ["paciente", "medico"],
      order: { fecha_hora: "DESC" },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOneCita(citaId: string): Promise<Cita> {
    // try {
    //   const bCita = this.citasRepository.findOneBy({ id: citaId });
    //   if (!bCita) {
    //     throw new BadRequestException(`Cita no encontrada ${citaId}`);
    //   }
    //   return bCita;
    // } catch (error) {
    //   throw new BadRequestException(error.message);
    // }

    try {
      const cacheData = await this.cacheManager.get<Cita>(citaId);

      if (cacheData) {
        return cacheData;
      }
      const bCita = this.citasRepository.findOneBy({ id: citaId });
      if (!bCita) {
        throw new BadRequestException(`Cita no encontrada ${citaId}`);
      }
      await this.cacheManager.set(citaId, bCita, 3600000);
      return bCita;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async update(citaId: string, updateCitaDto: UpdateCitaDto): Promise<Cita> {
    const bCita = await this.findOneCita(citaId);
    if (!bCita) {
      throw new BadRequestException(`Cita no encontrada ${citaId}`);
    }
    const citaModificada = await this.citasRepository.save({
      ...bCita,
      ...updateCitaDto,
    });
    return citaModificada;
  }

  async cancelarCita(citaId: string, userId: string): Promise<Cita> {
    try {
      const bCita = await this.findOneCita(citaId);
      if (bCita.estado === EstadoCita.CANCELADA) {
        throw new BadRequestException(
          `Cita ya estaba  cancelada con anterioridad `
        );
      }

      const citaModificada = await this.citasRepository.save({
        ...bCita,
        estado: EstadoCita.CANCELADA,
      });

      return citaModificada;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async remove(citaId: string): Promise<any> {
    try {
      const bCita = await this.findOneCita(citaId);

      await this.citasRepository.delete(citaId);
      return {
        message: `Cita ${citaId} eliminada correctamente`,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async cancelar(citaId: string, userId: string): Promise<Cita> {
    try {
      const usuario = await this.usuarioRepository.findOne({
        where: { id: userId },
        relations: ["roles"],
      });
      if (!usuario) {
        throw new BadRequestException("Usuario no encontrado");
      }
      if (usuario.rol !== Roles.MEDICO) {
        throw new BadRequestException("No tienes permisos para cancelar citas");
      }

      const bCita = await this.findOneCita(citaId);
      if (bCita.estado === EstadoCita.CANCELADA) {
        throw new BadRequestException(
          `Cita ya estaba  cancelada con anterioridad `
        );
      }

      const citaModificada = await this.citasRepository.save({
        ...bCita,
        estado: EstadoCita.CANCELADA,
      });

      return citaModificada;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async citasporMedico(
    medicoId: string,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      const bMedico = await this.citasRepository.findOne({
        where: { medico: { id: medicoId } },
      });

      if (!bMedico) {
        throw new BadRequestException(`Medico no encontrado ${medicoId}`);
      }

      const { page = 1, limit = 10 } = paginationDto || {};
      const skip = (page - 1) * limit;

      const [citas, total] = await this.citasRepository
        .createQueryBuilder("cita")
        .where("cita.medico_id = :medicoId", { medicoId })
        .orderBy("cita.fecha_hora", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      // 5. Retornar resultados
      return {
        data: citas,
        meta: {
          total: total,
          page: page,
          limit: limit,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException("Error al obtener citas de un medico");
      }
    }
  }

  async citadDelDiDeterminado(
    fecha: Date,
    medicoId: string,
    paginationDto: PaginationDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      if (!fecha) {
        throw new BadRequestException("Fecha no puede ser nula");
      }
      if (!medicoId) {
        throw new BadRequestException("Medico no puede ser nulo");
      }

      const bFecha = await this.citasRepository.findOne({
        where: { fecha_hora: fecha },
      });

      if (!bFecha) {
        throw new BadRequestException("Fecha No existe");
      }

      const bMedico = await this.medicoRepository.findOneBy({ id: medicoId });

      if (!bMedico) {
        throw new BadRequestException("Medico no existe");
      }

      const { page = 1, limit = 10 } = paginationDto || {};
      const skip = (page - 1) * limit;

      const [citas, total] = await this.citasRepository
        .createQueryBuilder("cita")
        .leftJoinAndSelect("cita.paciente", "paciente")
        .leftJoinAndSelect("cita.medico", "medico")
        .where("cita.fecha_hora = :fecha", { fecha })
        .andWhere("cita.medico_id=:medicoId", { medicoId })
        .orderBy("cita.fecha_hora", "DESC")
        .getManyAndCount();
      const totalPages = Math.ceil(total / limit);

      return {
        data: citas,
        meta: {
          page: page,
          limit: limit,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          total: total,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error instanceof Error) {
        throw new BadRequestException("Error al obtener citas de un medico");
      }
    }
  }

  async citadMedicoRangoFechas(
    medicoId: string,
    query: GetCitasRangoFechaDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      const { fecha, fechaFin, page = 1, limit = 10 } = query;

      if (!medicoId) {
        throw new BadRequestException("El ID del médico es requerido");
      }

      const bMedico = await this.medicoRepository.findOneBy({ id: medicoId });
      if (!bMedico) {
        throw new BadRequestException("Médico no encontrado");
      }

      const skip = (page - 1) * limit;
      const fechaInicio = new Date(fecha);
      const fechaFinal = new Date(fechaFin);

      const [citas, total] = await this.citasRepository
        .createQueryBuilder("cita")
        .leftJoinAndSelect("cita.paciente", "paciente")
        .leftJoinAndSelect("cita.medico", "medico")
        .where("cita.medico_id = :medicoId", { medicoId })
        .andWhere("cita.fecha_hora >= :fechaInicio", { fechaInicio })
        .andWhere("cita.fecha_hora <= :fechaFinal", { fechaFinal })
        .orderBy("cita.fecha_hora", "DESC")
        .skip(skip)
        .take(limit)
        .getManyAndCount();

      const totalPages = Math.ceil(total / limit);

      return {
        data: citas,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Error al obtener citas del médico");
    }
  }

  async reprogramarCita(
    citaId: string,
    userId: string,
    updateCitaDto: UpdateCitaDto
  ): Promise<Cita> {
    try {
      const usuario = await this.citasRepository.findOne({
        where: { medico: { id: userId } },
      });
      if (!usuario) {
        throw new BadRequestException("Usuario no encontrado");
      }
      const bCita = await this.findOneCita(citaId);
      const citaModificada = await this.citasRepository.save({
        ...bCita,
        ...updateCitaDto,
      });
      return citaModificada;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Error al Reprogramar Cita con el médico");
    }
  }
  //----------------- BUSQUEDA AVANZADAS

  async buscarCitasPorFecha(
    nombrePaciente: string,
    statusCita: string,
    fecha: Date,
    medicoId: string,
    paginationDto?: PaginationDto
  ): Promise<PaginatedResult<Cita>> {
    try {
      if (!nombrePaciente || !statusCita || !fecha || !medicoId) {
        throw new BadRequestException("Todos los campos son requeridos");
      }

      const bMedico = await this.medicoRepository.findOneBy({ id: medicoId });
      if (!bMedico) {
        throw new BadRequestException("Medico no existe");
      }

      const paciente = await this.usuarioRepository.findOne({
        where: { nombre: nombrePaciente, rol: Roles.PACIENTE },
      });

      if (!paciente) {
        throw new BadRequestException("El paciente no existe");
      }

      console.log("datos recibidos", paciente, bMedico, fecha);

      const query = this.citasRepository
        .createQueryBuilder("cita")
        .leftJoinAndSelect("cita.paciente", "paciente")
        .leftJoinAndSelect("cita.medico", "medico")
        .where("cita.medico_id = :medicoId", { medicoId })
        .andWhere("cita.paciente_id = :pacienteId", { pacienteId: paciente.id })
        .andWhere("cita.estado = :statusCita", {
          statusCita: statusCita.toLowerCase(),
        }) // Conversión a minúsculas
        .andWhere("cita.fecha_hora >= :fecha", { fecha })
        .orderBy("cita.fecha_hora", "DESC");

      const { page = 1, limit = 10 } = paginationDto || {};
      const skip = (page - 1) * limit;
      const [citas, total] = await query
        .skip(skip)
        .take(limit)
        .getManyAndCount();
      const totalPages = Math.ceil(total / limit);
      console.log("citas encontradas", citas);

      console.log("Consulta generada:", query.getSql());
      console.log("Parámetros:", {
        medicoId,
        pacienteId: paciente.id,
        statusCita: statusCita.toLowerCase(),
        fecha,
      });

      return {
        data: citas,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      console.error("Error al obtener citas de un medico", error);
      throw new BadRequestException("Error al obtener citas de un medico");
    }
  }
} // fin
