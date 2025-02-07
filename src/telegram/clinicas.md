Crear tu propia base de datos de clínicas:

````typescript
import { Injectable } from '@nestjs/common';

export interface Clinica {
  id: string;
  nombre: string;
  estado: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  especialidades: string[];
  horario: string;
  emergencia24h: boolean;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

@Injectable()
export class ClinicasVenezuelaService {
  private clinicas: Clinica[] = [
    {
      id: "1",
      nombre: "Centro Médico de Caracas",
      estado: "Distrito Capital",
      ciudad: "Caracas",
      direccion: "Av. Eraso, San Bernardino",
      telefono: "+58 212-555-1234",
      especialidades: ["Cardiología", "Pediatría", "Traumatología"],
      horario: "24 horas",
      emergencia24h: true,
      coordenadas: {
        lat: 10.506098,
        lng: -66.886967
      }
    },
    {
      id: "2",
      nombre: "Policlínica Metropolitana",
      estado: "Distrito Capital",
      ciudad: "Caracas",
      direccion: "Calle Monterrey, Urb. Miranda",
      telefono: "+58 212-555-5678",
      especialidades: ["Medicina General", "Ginecología", "Oftalmología"],
      horario: "Lunes a Domingo 7:00 AM - 7:00 PM",
      emergencia24h: true,
      coordenadas: {
        lat: 10.498765,
        lng: -66.879543
      }
    },
    // Agregar más clínicas aquí
  ];

  async buscarClinicas(params: {
    estado?: string;
    ciudad?: string;
    especialidad?: string;
  }): Promise<Clinica[]> {
    let resultado = this.clinicas;

    if (params.estado) {
      resultado = resultado.filter(
        clinica => clinica.estado.toLowerCase() === params.estado.toLowerCase()
      );
    }

    if (params.ciudad) {
      resultado = resultado.filter(
        clinica => clinica.ciudad.toLowerCase() === params.ciudad.toLowerCase()
      );
    }

    if (params.especialidad) {
      resultado = resultado.filter(clinica =>
        clinica.especialidades.some(
          esp => esp.toLowerCase() === params.especialidad.toLowerCase()
        )
      );
    }

    return resultado;
  }

  async obtenerClinicaCercana(lat: number, lng: number): Promise<Clinica | null> {
    if (this.clinicas.length === 0) return null;

    let clinicaCercana = this.clinicas[0];
    let distanciaMinima = this.calcularDistancia(
      lat,
      lng,
      clinicaCercana.coordenadas.lat,
      clinicaCercana.coordenadas.lng
    );

    for (const clinica of this.clinicas) {
      if (!clinica.coordenadas) continue;

      const distancia = this.calcularDistancia(
        lat,
        lng,
        clinica.coordenadas.lat,
        clinica.coordenadas.lng
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        clinicaCercana = clinica;
      }
    }

    return clinicaCercana;
  }

  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(grados: number): number {
    return (grados * Math.PI) / 180;
  }
}

2. Integración con el bot de Telegram:

```typescript
```typescript
import { Injectable } from '@nestjs/common';
import { ClinicasVenezuelaService, Clinica } from './clinicas-venezuela.service';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramClinicasService {
  constructor(private clinicasService: ClinicasVenezuelaService) {}

  async mostrarClinicasCercanas(bot: TelegramBot, chatId: number, location: TelegramBot.Location): Promise<void> {
    try {
      const clinica = await this.clinicasService.obtenerClinicaCercana(
        location.latitude,
        location.longitude
      );

      if (!clinica) {
        await bot.sendMessage(
          chatId,
          'Lo siento, no encontramos clínicas cercanas en este momento.'
        );
        return;
      }

      await this.enviarInformacionClinica(bot, chatId, clinica);
    } catch (error) {
      await bot.sendMessage(
        chatId,
        'Ocurrió un error al buscar clínicas cercanas. Por favor, intenta nuevamente.'
      );
    }
  }

  private async enviarInformacionClinica(
    bot: TelegramBot,
    chatId: number,
    clinica: Clinica
  ): Promise<void> {
    const mensaje = `
🏥 *${clinica.nombre}*

📍 *Dirección:* ${clinica.direccion}
🏙 *Ciudad:* ${clinica.ciudad}
📞 *Teléfono:* ${clinica.telefono}
⏰ *Horario:* ${clinica.horario}
${clinica.emergencia24h ? '🚨 *Servicio de Emergencia 24h*' : ''}

👨‍⚕️ *Especialidades:*
${clinica.especialidades.map(esp => `• ${esp}`).join('\n')}
    `;

    // Enviar ubicación si hay coordenadas disponibles
    if (clinica.coordenadas) {
      await bot.sendLocation(
        chatId,
        clinica.coordenadas.lat,
        clinica.coordenadas.lng
      );
    }

    await bot.sendMessage(chatId, mensaje, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '📞 Llamar',
              url: `tel:${clinica.telefono.replace(/\s/g, '')}`
            }
          ],
          [
            {
              text: '🔙 Volver al menú principal',
              callback_data: 'menu_principal'
            }
          ]
        ]
      }
    });
  }

  // Agregar al TelegramService existente
  async agregarComandosClinica(bot: TelegramBot): Promise<void> {
    bot.onText(/\/clinicas/, async (msg) => {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        'Para encontrar clínicas cercanas, por favor comparte tu ubicación:',
        {
          reply_markup: {
            keyboard: [
              [{
                text: '📍 Compartir ubicación',
                request_location: true
              }]
            ],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
    });

    bot.on('location', async (msg) => {
      if (msg.location) {
        await this.mostrarClinicasCercanas(bot, msg.chat.id, msg.location);
      }
    });
  }
}
Copy
Insert


Para usar este servicio:

1. Agrega el servicio a tu módulo:

```typescript
@Module({
  providers: [
    TelegramService,
    ClinicasVenezuelaService,
    TelegramClinicasService
  ],
  // ... otras configuraciones
})
export class AppModule {}


Inicializa los comandos de clínicas en tu TelegramService:
constructor(
  private configService: ConfigService,
  private telegramClinicasService: TelegramClinicasService
) {
  const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
  this.bot = new TelegramBot(token, { polling: true });
  this.initializeBot();
  this.telegramClinicasService.agregarComandosClinica(this.bot);
}

Agrega un botón en tu menú principal:
private getMainMenuKeyboard(): TelegramKeyboard {
  return {
    inline_keyboard: [
      // ... otros botones ...
      [{ text: "🏥 Buscar Clínicas Cercanas", callback_data: "buscar_clinicas" }],
    ],
  };
}

Alternativas para obtener datos de clínicas:

Usar Google Places API para Venezuela
Integrar con APIs de directorios médicos privados
Scrapear datos de sitios web de clínicas
Crear una base de datos colaborativa
Integrar con sistemas de información hospitalaria existentes
Para una solución más completa, podrías:

Agregar más datos de clínicas
Implementar cache de búsquedas
Agregar ratings y comentarios
Integrar sistema de citas
Agregar información sobre especialistas
Incluir información sobre seguros aceptados
¿Te gustaría que profundice en alguno de estos aspectos?

````
