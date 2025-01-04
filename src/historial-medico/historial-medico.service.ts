import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HistorialMedico } from "../Entities/HistorialMedico.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { DataSource } from "typeorm";
import { CreateHistorialMedicoDto } from "./dto/create-historial-medico.dto";
import { UpdateHistorialMedicoDto } from "./dto/update-historial-medico.dto";
import { BadRequestException } from "@nestjs/common";

@Injectable()
export class HistorialMedicoService {
  constructor(
    @InjectRepository(HistorialMedico)
    private historialMedicoRepository: Repository<HistorialMedico>,
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Medico)
    private medicoRepository: Repository<Medico>,

    private dataSource: DataSource
  ) {}

  async validaFecha(fecha: CreateHistorialMedicoDto): Promise<Date> {
    const fechaActual = new Date();
    const fechaNueva = new Date(fecha.fecha_creacion);
    if (fechaNueva.getTime() < fechaActual.getTime()) {
      throw new BadRequestException(
        "La fecha no puede ser menor a la fecha actual"
      );
    }
    return fechaNueva;
  }

  async existenciaHistorial(
    createHistorialMedicoDto: CreateHistorialMedicoDto
  ): Promise<boolean> {
    const bHistorial = await this.historialMedicoRepository.findOneBy({
      diagnostico: createHistorialMedicoDto.diagnostico,
      tratamiento: createHistorialMedicoDto.tratamiento,
    });
    if (bHistorial) {
      throw new BadRequestException(
        `Ya existe este registro de Historial Médico para el diagnóstico: ${bHistorial.diagnostico} 
        con el tratamiento: ${bHistorial.tratamiento}`
      );
    }
    return;
  }

  async create(
    createHistorialMedicoDto: CreateHistorialMedicoDto
  ): Promise<HistorialMedico> {
    try {
      await this.validaFecha(createHistorialMedicoDto);
      await this.existenciaHistorial(createHistorialMedicoDto);

      const paciente = await this.usuarioRepository.findOneBy({
        id: createHistorialMedicoDto.paciente_id,
        rol: Roles.PACIENTE,
      });

      const medico = await this.medicoRepository.findOneBy({
        id: createHistorialMedicoDto.medico_id,
        usuario: { rol: Roles.MEDICO },
      });

      if (!paciente || !medico) {
        throw new NotFoundException(
          "Paciente o Médico no Esta Registrado en nuestra Bd"
        );
      }

      const nHistorialMedico = await this.historialMedicoRepository.create({
        ...createHistorialMedicoDto,
        paciente: paciente,
        medico: medico,
      });
      const nuevoHistorialMedico = await this.historialMedicoRepository.save(
        nHistorialMedico
      );
      return nuevoHistorialMedico;
    } catch (error) {
      throw error;
    }
  }

  findAll() {
    return `This action returns all historialMedico`;
  }

  findOne(id: number) {
    return `This action returns a #${id} historialMedico`;
  }

  update(id: number, updateHistorialMedicoDto: UpdateHistorialMedicoDto) {
    return `This action updates a #${id} historialMedico`;
  }

  remove(id: number) {
    return `This action removes a #${id} historialMedico`;
  }
}
