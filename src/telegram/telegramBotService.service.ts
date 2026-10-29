import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as TelegramBot from 'node-telegram-bot-api';

/**
 * Servicio responsable de inicializar el bot de Telegram en modo webhook
 * y exponer utilidades de envío de mensajes.
 *
 * La instancia del bot se inyecta a través del proveedor "TELEGRAM_BOT"
 * definido en telegram.module.ts (creado con polling: false). Este servicio
 * se encarga de registrar el webhook en Telegram (con secret_token cuando
 * se configura) al iniciar el módulo.
 */
@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject('TELEGRAM_BOT') private readonly bot: TelegramBot,
  ) {}

  async onModuleInit(): Promise<void> {
    const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
    const secretToken = this.configService.get<string>(
      'TELEGRAM_WEBHOOK_SECRET_TOKEN',
    );

    if (!webhookUrl) {
      this.logger.warn(
        'TELEGRAM_WEBHOOK_URL no está configurado. El bot no recibirá actualizaciones vía webhook.',
      );
      return;
    }

    try {
      const options: Record<string, any> = {};
      if (secretToken) {
        options.secret_token = secretToken;
      }

      await this.bot.setWebHook(`${webhookUrl}/telegram-webhook`, options);
      this.logger.log(
        `Webhook configurado: ${webhookUrl}/telegram-webhook${secretToken ? ' (con secret_token)' : ''}`,
      );
    } catch (error) {
      this.logger.error('Error configurando webhook de Telegram:', error);
      throw error;
    }
  }

  async sendMessage(
    chatId: number,
    text: string,
    options?: TelegramBot.SendMessageOptions,
  ): Promise<TelegramBot.Message> {
    try {
      return await this.bot.sendMessage(chatId, text, options);
    } catch (error) {
      this.logger.error(`Error al enviar mensaje a ${chatId}:`, error);
      throw error;
    }
  }
}
