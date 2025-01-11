import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { RecetaMedicaService } from './receta-medica.service';
import { CreateRecetaMedicaDto } from './dto/create-receta-medica.dto';
import { UpdateRecetaMedicaDto } from './dto/update-receta-medica.dto';

@Controller('receta-medica')
export class RecetaMedicaController {
  constructor(private readonly recetaMedicaService: RecetaMedicaService) {}

  @Post()
  create(@Body() createRecetaMedicaDto: CreateRecetaMedicaDto) {
    return this.recetaMedicaService.create(createRecetaMedicaDto);
  }

  @Get()
  findAll() {
    return this.recetaMedicaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.recetaMedicaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRecetaMedicaDto: UpdateRecetaMedicaDto) {
    return this.recetaMedicaService.update(+id, updateRecetaMedicaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.recetaMedicaService.remove(+id);
  }
}
