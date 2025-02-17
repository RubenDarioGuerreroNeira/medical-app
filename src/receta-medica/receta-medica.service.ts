import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";

import { CreateRecetaMedicaDto } from "./dto/create-receta-medica.dto";
import { UpdateRecetaMedicaDto } from "./dto/update-receta-medica.dto";
import { RecetaMedica } from "../entities/RecetaMedica";
import { Cita } from "../entities/Cita.entity";
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

      const fecha_actual = new Date();
      if (datos.fecha_emision === null || datos.fecha_emision < fecha_actual) {
        throw new Error("Fecha de emisión no válida");
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
  async findAll(page: number, limit: number) {
    try {
      const skip = (page - 1) * limit;

      const [recetas, total] = await this.recetaMedicaRepository.findAndCount({
        order: { fecha_emision: "DESC" },
        skip: skip,
        take: limit,
        relations: ["cita"], // Agrega aquí las relaciones que necesites
      });

      if (!recetas.length && page > 1) {
        throw new NotFoundException("No se encontraron más recetas médicas");
      }

      return {
        recetas,
        total,
      };
    } catch (error) {
      throw new BadRequestException(
        error.message || "Error al obtener las recetas médicas"
      );
    }
  }

  async findOne(id: string): Promise<RecetaMedica> {
    const receta = await this.recetaMedicaRepository.findOne({
      where: { id: id },
    });

    if (!receta) {
      throw new NotFoundException("No se encontró la receta médica");
    }
    return receta;
  }

  async update(id: string, updateRecetaMedicaDto: UpdateRecetaMedicaDto) {
    try {
      if (id === undefined || id === null) {
        throw new BadRequestException("ID no proporcionado");
      }

      const receta = await this.recetaMedicaRepository.findOne({
        where: { id },
      });
      if (!receta) {
        throw new NotFoundException("No se encontró la receta médica");
      }
      const nuevaRecetaMedica = this.recetaMedicaRepository.merge(
        receta,
        updateRecetaMedicaDto
      );
      const actualizado = await this.recetaMedicaRepository.save(
        nuevaRecetaMedica
      );
      return {
        message: "Receta médica actualizada exitosamente",
        data: actualizado,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      if (!id || id === undefined || id === null) {
        throw new BadRequestException("Id Invalido o no proporcionado");
      }

      const receta = await this.recetaMedicaRepository.findOneBy({ id });
      if (!receta) {
        throw new NotFoundException(
          `No se encuentra la receta médica con id ${id}`
        );
      }
      await this.recetaMedicaRepository.delete(id);
      return receta;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
}
