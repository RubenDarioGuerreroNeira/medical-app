import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateNotaMedicaDto } from './dto/create-nota_medica.dto';
import { UpdateNotaMedicaDto } from './dto/update-nota_medica.dto';
import { NotaMedica } from '../entities/notaMedica.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
@Injectable()
export class NotaMedicaService {
  constructor(
    @InjectRepository(NotaMedica)
    private readonly notaMedicaRepository: Repository<NotaMedica>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async verificaNotaMedica(datos: CreateNotaMedicaDto) {
    try {
      const notaMedica = await this.notaMedicaRepository.findOne({
        where: {
          fecha_creacion: datos.fecha_creacion,
          cita: { id: datos.cita_id },
        },
        relations: ['cita'],
      });
      if (notaMedica) {
        return notaMedica;
      }
      return null;
    } catch (error) {
      throw new Error(`Error al verificar la nota médica: ${error.message}`);
    }
  }

  async create(datos: CreateNotaMedicaDto): Promise<NotaMedica> {
    try {
      const notaMedica = await this.verificaNotaMedica(datos);
      if (notaMedica !== null) {
        throw new Error('La nota médica ya existe');
      }

      const nuevaNotaMedica = this.notaMedicaRepository.create({
        contenido: 'Image Example',
        fecha_creacion: datos.fecha_creacion,
        es_privada: datos.es_privada,
        cita: { id: datos.cita_id },
      });

      return await this.notaMedicaRepository.save(nuevaNotaMedica);
    } catch (error) {
      throw new Error(`Error al crear la nota médica: ${error.message}`);
    }
  }

  async updateImageUrl(id: string, imageUrl: string): Promise<NotaMedica> {
    try {
      if (!id) {
        throw new Error(
          'ID de la nota médica no proporcionado ó no es un string',
        );
      }
      if (!imageUrl) {
        throw new Error('URL es inválida o no proporcionada');
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

  async findOne(id: string) {
    try {
      if (!id) {
        throw new Error('Id de la nota medica no proporcionado');
      }
      console.log(`Buscando nota médica con ID: ${id}`);
      const nota_medica = await this.notaMedicaRepository.findOne({
        where: { id: id },
      });
      if (!nota_medica) {
        throw new Error(`Nota médica no existe ${id}`);
      }
    } catch (error) {
      throw new Error(`Error al encontrar la nota medica: ${error.message}`);
    }
  }

  async update(
    id: string,
    updateNotaMedicaDto: UpdateNotaMedicaDto,
  ): Promise<NotaMedica> {
    try {
      const notaMedica = await this.notaMedicaRepository.findOneBy({
        id: id,
      });
      if (notaMedica === null) {
        throw new Error('La nota médica No existe');
      }

      // actualizo
      await this.notaMedicaRepository.update(
        { id: notaMedica.id },
        updateNotaMedicaDto,
      );

      // Recupero y muestro la Actualizada
      const notaMedicaUpdated = await this.notaMedicaRepository.findOneBy({
        id: notaMedica.id,
      });

      return notaMedicaUpdated;
    } catch (error) {
      throw error;
    }
  }

  async remove(id: string) {
    try {
      if (!id) {
        throw new Error('Id de la nota medica no proporcionado');
      }
      const notaEliminada = await this.notaMedicaRepository.findOneBy({
        id: id,
      });
      if (!notaEliminada) {
        throw new Error('La nota médica No existe');
      }
      await this.notaMedicaRepository.delete(id);
      return {
        message: 'Nota médica eliminada correctamente',
        notaEliminada,
      };
    } catch (error) {
      throw new Error(`Error al eliminar la nota médica: ${error.message}`);
    }
  }
}
