import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { CreateNotaMedicaDto } from "./dto/create-nota_medica.dto";
import { UpdateNotaMedicaDto } from "./dto/update-nota_medica.dto";
import { NotaMedica } from "../Entities/NotaMedica";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { NotFoundException } from "@nestjs/common";
@Injectable()
export class NotaMedicaService {
  constructor(
    @InjectRepository(NotaMedica)
    private readonly notaMedicaRepository: Repository<NotaMedica>,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  async verificaNotaMedica(datos: CreateNotaMedicaDto) {
    try {
      const notaMedica = await this.notaMedicaRepository.findOne({
        where: {
          fecha_creacion: datos.fecha_creacion,
          cita: { id: datos.cita_id },
        },
        relations: ["cita"],
      });
      if (notaMedica) {
        return notaMedica;
      }
      return null;
    } catch (error) {
      throw new Error(`Error al verificar la nota médica: ${error.message}`);
    }
  }

  async create(datos: CreateNotaMedicaDto) {
    try {
      const notaMedica = await this.verificaNotaMedica(datos);
      if (notaMedica) {
        throw new Error("La nota médica ya existe");
      }

      const nuevaNotaMedica = this.notaMedicaRepository.create(datos);
      return await this.notaMedicaRepository.save(nuevaNotaMedica);
    } catch (error) {
      throw new Error(`Error al crear la nota médica: ${error.message}`);
    }
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<NotaMedica> {
    try {
      if (!id) {
        throw new Error(
          "ID de la nota médica no proporcionado ó no es un string"
        );
      }
      if (!imageUrl) {
        throw new Error("URL es inválida o no proporcionada");
      }

      // 1. Buscamos la nota médica
      const notaMedica = await this.notaMedicaRepository.findOne({
        where: { id },
      });

      if (!notaMedica) {
        throw new NotFoundException(`Nota médica con ID ${id} no encontrada`);
      }

      // 2. Actualizamos el campo contenido con la URL
      notaMedica.contenido = imageUrl;

      // 3. Guardamos los cambios
      return await this.notaMedicaRepository.save(notaMedica);
    } catch (error) {
      throw new Error(`Error al actualizar la nota médica: ${error.message}`);
    }
  }

  async findAll() {
    return await this.notaMedicaRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} notaMedica`;
  }

  update(id: number, updateNotaMedicaDto: UpdateNotaMedicaDto) {
    return `This action updates a #${id} notaMedica`;
  }

  remove(id: number) {
    return `This action removes a #${id} notaMedica`;
  }
}
