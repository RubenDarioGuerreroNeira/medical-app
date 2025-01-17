import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";
import { HttpException, HttpStatus } from "@nestjs/common";

import { Cita } from "../Entities/Cita.entity";
import { EstadoCita } from "../Entities/Cita.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { HistorialMedico } from "src/Entities/HistorialMedico.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { PaginationDto, PaginatedResult } from "src/Dto Pagination/Pagination";

@Injectable()
export class CitasService {
  constructor(
    @InjectRepository(Cita)
    private citasRepository: Repository<Cita>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Medico)
    private medicoRepository: Repository<Medico>,
    @InjectRepository(HistorialMedico)
    private historialMedicoRepository: Repository<HistorialMedico>
  ) {}

  async verificaMedico(medico_id: string): Promise<Medico> {
    const medico = await this.medicoRepository.findOne({
      where: { id: medico_id },
    });

    if (!medico) {
      throw new BadRequestException("Médico no encontrado");
    }

    return medico;
  }

  async verificaCita(datosCita: CreateCitaDto): Promise<Cita> {
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

      return bCita;
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

      const bcita = await this.verificaCita(createCitaDto);

      const cita = this.citasRepository.create({
        paciente,
        medico,
        fecha_hora: bcita.fecha_hora,
        estado: EstadoCita.CONFIRMADA,
      });

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
        hasNextPAge: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOneCita(citaId: string): Promise<Cita> {
    try {
      const bCita = this.citasRepository.findOneBy({ id: citaId });
      if (!bCita) {
        throw new BadRequestException(`Cita no encontrada ${citaId}`);
      }
      return bCita;
    } catch (error) {
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
  ): Promise<{ citas: Cita[]; total: number }> {
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

      // 5. Retornar resultados
      return {
        citas,
        total,
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
}
