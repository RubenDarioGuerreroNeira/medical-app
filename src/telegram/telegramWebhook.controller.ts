import {
  Controller,
  Post,
  Body,
  Logger,
  Inject,
  HttpException,
  HttpStatus,
  Header,
  Req,
  Headers,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';
import { Request } from 'express';

@Controller('telegram-webhook')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('TELEGRAM_BOT') private readonly bot: TelegramBot,
  ) {}

  @Post()
  @Header('content-type', 'text/plain')
  async handleWebhook(
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') headerToken?: string,
  ): Promise<string> {
    try {
      // --- Verificación de secret_token (P0.1) ---
      const secretToken = this.configService.get<string>(
        'TELEGRAM_WEBHOOK_SECRET_TOKEN',
      );
      if (secretToken) {
        if (!headerToken || headerToken !== secretToken) {
          this.logger.warn(
            'Webhook recibido con secret_token inválido o ausente',
          );
          throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
        }
      }

      this.logger.debug(
        'Webhook update recibido:',
        JSON.stringify(update).slice(0, 500),
      );

      // --- Procesar la actualización con los handlers registrados en el bot ---
      await this.bot.processUpdate(update);

      return 'OK';
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error('Error procesando webhook:', error);
      throw new HttpException(
        'Internal Server Error',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
