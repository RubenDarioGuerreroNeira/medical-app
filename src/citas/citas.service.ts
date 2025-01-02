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

  async create(createCitaDto: CreateCitaDto): Promise<any> {
    try {
      await this.verificaMedico(createCitaDto.medico_id);

      const paciente = await this.usuarioRepository.findOne({
        where: { id: createCitaDto.paciente_id, rol: Roles.PACIENTE },
      });

      const medico = await this.medicoRepository.findOne({
        where: { id: createCitaDto.medico_id },
      });

      if (!paciente) {
        throw new BadRequestException("Paciente no encontrado");
      }
      if (!medico) {
        throw new BadRequestException("Médico no encontrado");
      }

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

  findOne(citaId: string): Promise<Cita> {
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
    const bCita = this.citasRepository.findOneBy({ id: citaId });
    if (!bCita) {
      throw new BadRequestException(`Cita no encontrada ${citaId}`);
    }
    const citaModificada = await this.citasRepository.save({
      ...bCita,
      ...updateCitaDto,
    });
    return citaModificada;
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
