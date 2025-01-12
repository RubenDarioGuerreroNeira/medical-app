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

  private async verificaRecetaMedica(datos: CreateRecetaMedicaDto) {
    try {
      const recetaMedica = await this.recetaMedicaRepository.findOne({
        where: {
          fecha_emision: datos.fecha_emision,
          cita: { id: datos.cita_id },
        },
        relations: ["cita"],
      });
      if (recetaMedica) {
        return recetaMedica;
      }
      return null;
    } catch (error) {
      throw new Error(`Error al verificar la receta médica: ${error.message}`);
    }
  }

  async create(datos: CreateRecetaMedicaDto): Promise<RecetaMedica> {
    try {
      if (!datos.cita_id) {
        throw new Error("Cita ID no proporcionada");
      }
      const cita = await this.verificaRecetaMedica(datos);
      if (cita !== null) {
        throw new Error("La receta médica ya existe");
      }
      const nuevaRecetaMedica = this.recetaMedicaRepository.create({
        medicamentos: datos.medicamentos,
        indicaciones: datos.indicaciones,
        fecha_emision: datos.fecha_emision,
        archivo_url: datos.archivo_url,
        cita: cita,
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
