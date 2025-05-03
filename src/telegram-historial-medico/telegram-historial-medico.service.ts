import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TelegramHistorialMedico } from "../Entities/TelegramHistorialMedico.entity";
import { CreateTelegramHistorialMedicoDto } from "./dto/create-telegram-historial-medico.dto";
import { UpdateTelegramHistorialMedicoDto } from "./dto/update-telegram-historial-medico.dto";

@Injectable()
export class TelegramHistorialMedicoService {
  constructor(
    @InjectRepository(TelegramHistorialMedico)
    private telegramHistorialMedicoRepository: Repository<TelegramHistorialMedico>
  ) {}

  async create(
    createDto: CreateTelegramHistorialMedicoDto
  ): Promise<TelegramHistorialMedico> {
    const historial = this.telegramHistorialMedicoRepository.create(createDto);
    return this.telegramHistorialMedicoRepository.save(historial);
  }

  async findAll(): Promise<TelegramHistorialMedico[]> {
    return this.telegramHistorialMedicoRepository.find();
  }

  async findOne(id: number): Promise<TelegramHistorialMedico> {
    const historial = await this.telegramHistorialMedicoRepository.findOneBy({
      id,
    });

    if (!historial) {
      throw new NotFoundException(
        `Historial médico con ID ${id} no encontrado`
      );
    }

    return historial;
  }

  async findByUserId(userId: string): Promise<TelegramHistorialMedico[]> {
    return this.telegramHistorialMedicoRepository.findBy({ userId });
  }

  async findByChatId(chatId: string): Promise<TelegramHistorialMedico[]> {
    return this.telegramHistorialMedicoRepository.findBy({ chatId });
  }

  async update(
    id: number,
    updateDto: UpdateTelegramHistorialMedicoDto
  ): Promise<TelegramHistorialMedico> {
    const historial = await this.findOne(id);

    Object.assign(historial, updateDto);

    return this.telegramHistorialMedicoRepository.save(historial);
  }

  async remove(id: number): Promise<void> {
    const historial = await this.findOne(id);
    await this.telegramHistorialMedicoRepository.remove(historial);
  }
}
