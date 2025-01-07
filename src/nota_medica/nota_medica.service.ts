import { Injectable } from '@nestjs/common';
import { CreateNotaMedicaDto } from './dto/create-nota_medica.dto';
import { UpdateNotaMedicaDto } from './dto/update-nota_medica.dto';

@Injectable()
export class NotaMedicaService {
  create(createNotaMedicaDto: CreateNotaMedicaDto) {
    return 'This action adds a new notaMedica';
  }

  findAll() {
    return `This action returns all notaMedica`;
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
