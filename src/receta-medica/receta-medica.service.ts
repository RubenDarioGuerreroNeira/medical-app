import { Injectable } from "@nestjs/common";
import { CreateRecetaMedicaDto } from "./dto/create-receta-medica.dto";
import { UpdateRecetaMedicaDto } from "./dto/update-receta-medica.dto";
import { RecetaMedica } from "../Entities/RecetaMedica";

@Injectable()
export class RecetaMedicaService {
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
