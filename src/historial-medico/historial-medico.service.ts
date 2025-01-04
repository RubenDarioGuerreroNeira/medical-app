import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HistorialMedico } from "../Entities/HistorialMedico.entity";
import { Usuario } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
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
  create(createHistorialMedicoDto: CreateHistorialMedicoDto) {
    return "This action adds a new historialMedico";
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
