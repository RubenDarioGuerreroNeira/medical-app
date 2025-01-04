import { BadRequestException, Injectable } from "@nestjs/common";
import { CreateCitaDto } from "./dto/create-cita.dto";
import { UpdateCitaDto } from "./dto/update-cita.dto";

import { Cita } from "../Entities/Cita.entity";
import { EstadoCita } from "../Entities/Cita.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { HistorialMedico } from "src/Entities/HistorialMedico.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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

  async create(createCitaDto: CreateCitaDto): Promise<any> {
    try {
      const medico = await this.verificaMedico(createCitaDto.medico_id);

      const paciente = await this.usuarioRepository.findOne({
        where: { id: createCitaDto.paciente_id, rol: Roles.PACIENTE },
      });

      const bcita = await this.verificaCita(createCitaDto);

      // if (!paciente) {
      //   throw new BadRequestException("Paciente no encontrado");
      // }
      // if (!medico) {
      //   throw new BadRequestException("Médico no encontrado");
      // }

      // if (!bcita) {
      //   throw new BadRequestException("Cita no encontrada");
      // }

      const cita = this.citasRepository.create({
        paciente,
        medico,
        fecha_hora: createCitaDto.fecha_hora,
        estado: EstadoCita.CONFIRMADA,
      });

      const res = await this.citasRepository.save(cita);
      return {
        ...res,
        paciente: paciente,
        medico: medico,
        message: "Cita creada exitosamente",
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(): Promise<Cita[]> {
    return this.citasRepository.find();
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
      const bCita = this.citasRepository.findOneBy({ id: citaId });
      if (!bCita) {
        throw new BadRequestException(`Cita no encontrada ${citaId}`);
      }
      await this.citasRepository.delete(citaId);
      return {
        message: `Cita ${citaId} eliminada correctamente`,
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
