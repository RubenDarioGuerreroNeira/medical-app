import { Injectable } from "@nestjs/common";

import { CreateRecetaMedicaDto } from "./dto/create-receta-medica.dto";
import { UpdateRecetaMedicaDto } from "./dto/update-receta-medica.dto";
import { RecetaMedica } from "../Entities/RecetaMedica";
import { Cita } from "src/Entities/Cita.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

@Injectable()
export class RecetaMedicaService {
  constructor(
    @InjectRepository(RecetaMedica)
    private recetaMedicaRepository: Repository<RecetaMedica>,
    @InjectRepository(Cita)
    private citaRepository: Repository<Cita>
  ) {}

  create(createRecetaMedicaDto: CreateRecetaMedicaDto) {
    return "This action adds a new recetaMedica";
  }

  findAll() {
    return `This action returns all recetaMedica`;
  }

  findOne(id: number) {
    return `This action returns a #${id} recetaMedica`;
  }

  update(id: number, updateRecetaMedicaDto: UpdateRecetaMedicaDto) {
    return `This action updates a #${id} recetaMedica`;
  }

  remove(id: number) {
    return `This action removes a #${id} recetaMedica`;
  }
}
