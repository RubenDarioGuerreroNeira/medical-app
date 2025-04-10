// telegram.controller.ts
import { Controller, Get, Param, Post, Body } from "@nestjs/common";
import { TelegramService } from "./services/telegram.service";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";

@ApiTags("Telegram")
@Controller("telegram")
export class TelegramController {
  constructor(private readonly telegramService: TelegramService) {}

  @ApiOperation({ summary: "Envía un mensaje a un chat" })
  @ApiResponse({
    status: 200,
    description: "Mensaje enviado correctamente",
  })
  @ApiResponse({
    status: 400,
    description: "Error al enviar el mensaje",
  })
  @Post()
  sendMessage(@Param("chatId") chatId: number, @Body() message: string) {
    return this.telegramService.sendMessage(chatId, message);
  }

  @Get()
  getHello() {
    return this.telegramService.sendMessage(123456789, "Hola, mundo!");
  }

  @Post()
  postHello() {
    return this.telegramService.sendMessage(123456789, "Hola, mundo!");
  }
}

// // telegram.controller.ts
// import { Controller, Get, Param, Post, Body } from "@nestjs/common";
// import { TelegramService } from "./telegram.service";
// import {
//   ApiTags,
//   ApiOperation,
//   ApiResponse,
//   ApiParam,
//   ApiQuery,
//   ApiBody,
//   ApiBearerAuth,
// } from "@nestjs/swagger";

// @ApiTags("Telegram")
// @Controller("telegram")
// export class TelegramController {
//   constructor(private readonly telegramService: TelegramService) {}
//   @ApiOperation({ summary: "Envía un mensaje a un chat" })
//   @ApiResponse({
//     status: 200,
//     description: "Mensaje enviado correctamente",
//   })
//   @ApiResponse({
//     status: 400,
//     description: "Error al enviar el mensaje",
//   })
//   @Post()
//   sendMessage(@Param("chatId") chatId: number, @Body() message: string) {
//     return this.telegramService.sendMessage(chatId, message);
//   }

//   @Get()
//   getHello() {
//     return this.telegramService.sendMessage(123456789, "Hola, mundo!");
//   }

//   @Post()
//   postHello() {
//     return this.telegramService.sendMessage(123456789, "Hola, mundo!");
//   }
// }
