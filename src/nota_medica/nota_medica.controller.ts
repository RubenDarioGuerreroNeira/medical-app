import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NotaMedicaService } from './nota_medica.service';
import { CreateNotaMedicaDto } from './dto/create-nota_medica.dto';
import { UpdateNotaMedicaDto } from './dto/update-nota_medica.dto';

@Controller('nota-medica')
export class NotaMedicaController {
  constructor(private readonly notaMedicaService: NotaMedicaService) {}

  @Post()
  create(@Body() createNotaMedicaDto: CreateNotaMedicaDto) {
    return this.notaMedicaService.create(createNotaMedicaDto);
  }

  @Get()
  findAll() {
    return this.notaMedicaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notaMedicaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNotaMedicaDto: UpdateNotaMedicaDto) {
    return this.notaMedicaService.update(+id, updateNotaMedicaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notaMedicaService.remove(+id);
  }
}
