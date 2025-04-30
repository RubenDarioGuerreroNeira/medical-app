import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TelegramHistorialMedicoService } from './telegram-historial-medico.service';
import { CreateTelegramHistorialMedicoDto } from './dto/create-telegram-historial-medico.dto';
import { UpdateTelegramHistorialMedicoDto } from './dto/update-telegram-historial-medico.dto';

@Controller('telegram-historial-medico')
export class TelegramHistorialMedicoController {
  constructor(private readonly telegramHistorialMedicoService: TelegramHistorialMedicoService) {}

  @Post()
  create(@Body() createDto: CreateTelegramHistorialMedicoDto) {
    return this.telegramHistorialMedicoService.create(createDto);
  }

  @Get()
  findAll() {
    return this.telegramHistorialMedicoService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.telegramHistorialMedicoService.findOne(+id);
  }

  @Get('user/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.telegramHistorialMedicoService.findByUserId(userId);
  }

  @Get('chat/:chatId')
  findByChatId(@Param('chatId') chatId: string) {
    return this.telegramHistorialMedicoService.findByChatId(chatId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateTelegramHistorialMedicoDto) {
    return this.telegramHistorialMedicoService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.telegramHistorialMedicoService.remove(+id);
  }
}