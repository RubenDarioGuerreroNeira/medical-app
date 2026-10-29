import { Injectable, Inject } from '@nestjs/common';
import { TelegramBaseService } from './telegram-base.service';
import { OSMService } from '../farmacias-maps.service';
import { ClinicasVenezuelaService } from '../centros-hospitalarios.service';
import * as TelegramBot from 'node-telegram-bot-api';
import { ConfigService } from '@nestjs/config';
import { TelegramErrorHandler } from '../telegramErrorHandler.service';
import { TelegramDiagnosticService } from '../telegramDiagnosticService.service';
import { TelegramMenuService } from './telegram-menu.service';
import { TelegramMessageFormatter } from '../telegramMessageFormatter.service';
import { Clinica } from '../intrfaces/interface-clinicas';
import { Farmacia } from '../intrfaces/osm.interface';

interface Location {
  latitude: number;
  longitude: number;
}

@Injectable()
export class TelegramLocationService extends TelegramBaseService {
  constructor(
    private readonly osmService: OSMService,
    private readonly clinicasVenezuelaService: ClinicasVenezuelaService,
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    private readonly menuService: TelegramMenuService,
    private readonly messageFormatter: TelegramMessageFormatter,
    @Inject('TELEGRAM_BOT') bot: TelegramBot,
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

  async solicitarUbicacion(
    chatId: number,
    tipo: 'farmacia' | 'clinica',
  ): Promise<void> {
    const mensaje =
      tipo === 'farmacia'
        ? 'Para encontrar Las Farmacias más cercanas, necesito tu ubicación actual.'
        : 'Para encontrar Los Centros de Atención Médica más cercanos, necesito tu ubicación actual.';

    await this.bot.sendMessage(
      chatId,
      `${mensaje}\nPor favor, comparte tu ubicación usando el botón de abajo:`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: '📍 Compartir ubicación',
                request_location: true,
              },
            ],
            [
              {
                text: '❌ Cancelar',
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      },
    );

    this.setupLocationHandler(chatId, tipo);
  }

  private setupLocationHandler(
    chatId: number,
    tipo: 'farmacia' | 'clinica',
  ): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      this.bot.removeListener('message', messageHandler);

      if (msg.location) {
        await this.procesarUbicacion(chatId, msg.location, tipo);
      } else if (msg.text === '❌ Cancelar') {
        await this.cancelarBusqueda(chatId);
      }
    };

    this.bot.on('message', messageHandler);
  }

  private async procesarUbicacion(
    chatId: number,
    location: Location,
    tipo: 'farmacia' | 'clinica',
  ): Promise<void> {
    const searchingMessage = await this.bot.sendMessage(
      chatId,
      tipo === 'farmacia'
        ? 'Buscando Farmacias Cercanas a tu ubicación... 🔍'
        : 'Buscando Centros de Atención Médica Cercanos a tu ubicación... 🔍',
      { reply_markup: { remove_keyboard: true } },
    );

    try {
      if (tipo === 'farmacia') {
        await this.buscarFarmaciasCercanas(chatId, location);
      } else {
        await this.buscarClinicasCercanas(chatId, location);
      }
    } catch (error) {
      this.logger.error(`Error buscando ${tipo}s cercanas:`, error);
      await this.handleLocationError(chatId);
    } finally {
      await this.bot.deleteMessage(chatId, searchingMessage.message_id);
    }
  }

  private async buscarFarmaciasCercanas(
    chatId: number,
    location: Location,
  ): Promise<void> {
    const farmacias = await this.osmService.buscarFarmaciaCercana(
      location.latitude,
      location.longitude,
    );

    if (!farmacias || farmacias.length === 0) {
      await this.enviarMensajeNoResultados(chatId, 'farmacias');
      return;
    }

    await this.enviarResultadosFarmacias(chatId, farmacias);
  }

  private async buscarClinicasCercanas(
    chatId: number,
    location: Location,
  ): Promise<void> {
    const clinicas = await this.osmService.buscarClinicaCercana(
      location.latitude,
      location.longitude,
    );

    if (!clinicas || clinicas.length === 0) {
      await this.enviarMensajeNoResultados(chatId, 'centros médicos');
      return;
    }

    await this.enviarResultadosClinicas(chatId, clinicas, location);
  }

  private async enviarResultadosFarmacias(
    chatId: number,
    farmacias: any[],
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `Se encontraron ${farmacias.length} farmacias cercanas:`,
    );

    for (const farmaciaResponse of farmacias.slice(0, 5)) {
      const farmacia: Farmacia = {
        ...farmaciaResponse,
        horario: farmaciaResponse.horario || 'Horario no disponible',
        coordenadas: farmaciaResponse.location,
      };
      await this.enviarInformacionFarma(chatId, farmacia);
    }
  }

  private async enviarResultadosClinicas(
    chatId: number,
    clinicas: any[],
    location: Location,
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `Se encontraron ${clinicas.length} centros médicos cercanos:`,
    );

    for (const clinicaResponse of clinicas.slice(0, 5)) {
      const clinica: Clinica = {
        id: clinicaResponse.id || `temp-${Date.now()}`,
        nombre: clinicaResponse.name || 'Centro Médico',
        direccion: clinicaResponse.address || 'Dirección no disponible',
        ciudad: clinicaResponse.city || 'Ciudad no especificada',
        estado: clinicaResponse.state || 'Estado no especificado',
        telefono: clinicaResponse.telefono || 'No disponible',
        coordenadas: {
          lat: clinicaResponse.location?.lat || location.latitude,
          lng: clinicaResponse.location?.lng || location.longitude,
        },
        horario: clinicaResponse.horario || 'Horario no disponible',
        especialidades: clinicaResponse.especialidades || ['Medicina General'],
        emergencia24h: clinicaResponse.emergencia24h || false,
      };
      await this.enviarInformacionClinica(chatId, clinica);
    }
  }

  private async enviarInformacionFarma(
    chatId: number,
    farmacia: Farmacia,
  ): Promise<void> {
    try {
      if (farmacia.coordenadas?.lat && farmacia.coordenadas?.lng) {
        await this.bot.sendLocation(
          chatId,
          farmacia.coordenadas.lat,
          farmacia.coordenadas.lng,
        );
      }

      let message = `🏥 *${this.escapeMarkdown(farmacia.nombre || 'Farmacia')}*\n\n`;
      message += `📍 *Dirección:* ${this.escapeMarkdown(farmacia.direccion || 'No disponible')}\n`;
      message += `🕒 *Horario:* ${this.escapeMarkdown(farmacia.horario || 'No disponible')}\n`;
      message += `📱 *Teléfono:* ${this.escapeMarkdown(farmacia.telefono || 'No disponible')}\n`;
      message += `🚪 *Estado:* ${farmacia.servicio24h ? 'Abierto ahora' : 'Posiblemente cerrado'}\n`;

      const inlineKeyboard = [];
      if (farmacia.telefono) {
        inlineKeyboard.push([
          {
            text: '📞 Llamar',
            url: `tel:${farmacia.telefono.replace(/\s+/g, '')}`,
          },
        ]);
      }
      inlineKeyboard.push([
        {
          text: '🗺️ Obtener indicaciones',
          url: `https://www.google.com/maps/dir/?api=1&destination=${farmacia.coordenadas.lat},${farmacia.coordenadas.lng}`,
        },
      ]);

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      this.logger.error('Error al enviar información de farmacia:', error);
      await this.bot.sendMessage(
        chatId,
        'Ocurrió un error al mostrar la información de la farmacia.',
      );
    }
  }

  private async enviarInformacionClinica(
    chatId: number,
    clinica: Clinica,
  ): Promise<void> {
    try {
      if (clinica.coordenadas?.lat && clinica.coordenadas?.lng) {
        await this.bot.sendLocation(
          chatId,
          clinica.coordenadas.lat,
          clinica.coordenadas.lng,
        );
      }

      const message = this.messageFormatter.formatClinicMessage(clinica);
      const phoneUrl = this.messageFormatter.formatPhoneNumber(
        clinica.telefono || '',
      );

      await this.bot.sendMessage(chatId, message, {
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [
            [{ text: '📱 Contactar', url: phoneUrl }],
            [
              {
                text: '🗺 Cómo llegar',
                url: `https://www.google.com/maps/dir/?api=1&destination=${clinica.coordenadas.lat},${clinica.coordenadas.lng}`,
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error('Error enviando información de la clínica:', error);
      await this.handleLocationError(chatId);
    }
  }

  private async enviarMensajeNoResultados(
    chatId: number,
    tipo: string,
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `No se encontraron ${tipo} cercanos a tu ubicación.`,
      {
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

  private async cancelarBusqueda(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, 'Búsqueda cancelada', {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    await this.menuService.mostrarMenuPrincipal(chatId);
  }

  private async handleLocationError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      'Lo siento, ocurrió un error al procesar tu ubicación. Por favor, intenta nuevamente.',
      {
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
