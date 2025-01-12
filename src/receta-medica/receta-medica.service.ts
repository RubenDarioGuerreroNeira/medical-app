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

  async create(
    createRecetaMedicaDto: CreateRecetaMedicaDto
  ): Promise<RecetaMedica> {
    try {
      if (!createRecetaMedicaDto.cita_id) {
        throw new Error("Cita ID no proporcionada");
      }
      const cita = this.citaRepository.findOne({
        where: { id: createRecetaMedicaDto.cita_id },
      });

      if (!cita) {
        throw new Error("Cita no encontrada");
      }
      const nuevaRecetaMedica = this.recetaMedicaRepository.create({
        medicamentos: createRecetaMedicaDto.medicamentos,
        indicaciones: createRecetaMedicaDto.indicaciones,
        fecha_emision: createRecetaMedicaDto.fecha_emision,
        archivo_url: createRecetaMedicaDto.archivo_url,
        cita: await cita,
      });
      return await this.recetaMedicaRepository.save(nuevaRecetaMedica);
    } catch (error) {
      throw new Error(`Error al crear la receta médica: ${error.message}`);
    }
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<RecetaMedica> {
    const recetaMedica = await this.recetaMedicaRepository.findOneBy({
      id: id,
    });
    if (!recetaMedica) {
      throw new Error("La receta médica No existe");
    }
    recetaMedica.archivo_url = imageUrl;
    return await this.recetaMedicaRepository.save(recetaMedica);
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
