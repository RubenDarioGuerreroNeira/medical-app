import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCitaDto } from './dto/create-cita.dto';
import { UpdateCitaDto } from './dto/update-cita.dto';
import { Cita } from '../Entities/Cita.entity';
import { EstadoCita } from '../Entities/Cita.entity';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';
import { HistorialMedico } from 'src/Entities/HistorialMedico.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
private historialMedicoRepository: Repository <HistorialMedico>,


  ) {}

  
  async create(createCitaDto: CreateCitaDto): Promise<Cita> {
    try {
      const paciente = await this.usuarioRepository.findOne({
        where: { id: createCitaDto.pacienteId }
      });
      const medico = await this.medicoRepository.findOne({
        where: { id: createCitaDto.medicoId }
      });

      if (!paciente || !medico) {
        throw new BadRequestException('Paciente o médico no encontrado');
      }

      const cita = this.citasRepository.create({
        paciente,
        medico,
        fecha_hora: createCitaDto.fechaHora,
        estado: EstadoCita.CONFIRMADA,  
      });

      return await this.citasRepository.save(cita);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  findAll() {
    return `This action returns all citas`;
  }

  findOne(id: number) {
    return `This action returns a #${id} cita`;
  }

  update(id: number, updateCitaDto: UpdateCitaDto) {
    return `This action updates a #${id} cita`;
  }

  remove(id: number) {
    return `This action removes a #${id} cita`;
  }
}
