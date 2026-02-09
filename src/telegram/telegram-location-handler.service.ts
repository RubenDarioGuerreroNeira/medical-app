import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { ClinicasVenezuelaService } from './centros-hospitalarios.service';
import { Clinica } from './intrfaces/interface-clinicas';
import { TelegramMessageFormatter } from './telegramMessageFormatter.service';

@Injectable()
export class TelegramLocationHandler {
  private readonly logger = new Logger(TelegramLocationHandler.name);

  constructor(
    private clinicasVenezuelaService: ClinicasVenezuelaService,
    private telegramMessageFormatter: TelegramMessageFormatter,
  ) {}

  async handleLocation(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location,
  ): Promise<void> {
    try {
      // Primero enviamos un mensaje de "buscando"
      await bot.sendMessage(chatId, '🔍 Buscando centros médicos cercanos...');

      const clinica = await this.clinicasVenezuelaService.obtenerClinicaCercana(
        location.latitude,
        location.longitude,
      );

      if (!clinica) {
        await bot.sendMessage(
          chatId,
          'Lo siento, no encontré centros médicos cercanos a tu ubicación\\.',
          {
            parse_mode: 'MarkdownV2',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '🔙 Volver al menú principal',
                    callback_data: 'menu_principal',
                  },
                ],
              ],
            },
          },
        );
        return;
      }

      // Si encontramos una clínica, enviamos su ubicación
      if (clinica.coordenadas) {
        try {
          await bot.sendLocation(
            chatId,
            clinica.coordenadas.lat,
            clinica.coordenadas.lng,
          );
        } catch (locationError) {
          this.logger.error('Error sending location:', locationError);
          // Continuamos con el resto de la información aunque falle el envío de la ubicación
        }
      }

      // Preparamos el mensaje con la información de la clínica
      const mensaje =
        this.telegramMessageFormatter.formatClinicMessage(clinica);

      // Enviamos el mensaje con la información
      await bot.sendMessage(chatId, mensaje, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📞 Llamar',
                url: this.telegramMessageFormatter.formatTelLink(
                  clinica.telefono,
                ),
              },
            ],
            [
              {
                text: '🔙 Volver al menú principal',
                callback_data: 'menu_principal',
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error processing location:', error);

      // Enviamos un mensaje de error amigable al usuario
      await bot.sendMessage(
        chatId,
        'Lo siento, ocurrió un error al buscar centros médicos\\. Por favor, intenta nuevamente\\.',
        {
          parse_mode: 'MarkdownV2',
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🔙 Volver al menú principal',
                  callback_data: 'menu_principal',
                },
              ],
            ],
          },
        },
      );
    }
  }
}
