import { Injectable, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { Clinica } from "./intrfaces/interface-clinicas";

@Injectable()
export class TelegramLocationHandler {
  private readonly logger = new Logger(TelegramLocationHandler.name);

  constructor(private clinicasVenezuelaService: ClinicasVenezuelaService) {}

  async handleLocation(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location
  ): Promise<void> {
    try {
      // Primero enviamos un mensaje de "buscando"
      await bot.sendMessage(chatId, "🔍 Buscando centros médicos cercanos...");

      const clinica = await this.clinicasVenezuelaService.obtenerClinicaCercana(
        location.latitude,
        location.longitude
      );

      if (!clinica) {
        await bot.sendMessage(
          chatId,
          "Lo siento, no encontré centros médicos cercanos a tu ubicación\\.",
          {
            parse_mode: "MarkdownV2",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔙 Volver al menú principal",
                    callback_data: "menu_principal",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      // Si encontramos una clínica, enviamos su ubicación
      if (clinica.coordenadas) {
        try {
          await bot.sendLocation(
            chatId,
            clinica.coordenadas.lat,
            clinica.coordenadas.lng
          );
        } catch (locationError) {
          this.logger.error("Error sending location:", locationError);
          // Continuamos con el resto de la información aunque falle el envío de la ubicación
        }
      }

      // Preparamos el mensaje con la información de la clínica
      const mensaje = this.prepareClinicMessage(clinica);

      // Enviamos el mensaje con la información
      await bot.sendMessage(chatId, mensaje, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📞 Llamar",
                url: this.formatPhoneNumber(clinica.telefono),
              },
            ],
            [
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });
    } catch (error) {
      this.logger.error("Error processing location:", error);

      // Enviamos un mensaje de error amigable al usuario
      await bot.sendMessage(
        chatId,
        "Lo siento, ocurrió un error al buscar centros médicos\\. Por favor, intenta nuevamente\\.",
        {
          parse_mode: "MarkdownV2",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          },
        }
      );
    }
  }

  private prepareClinicMessage(clinica: Clinica): string {
    // Función auxiliar para escapar caracteres especiales de MarkdownV2
    const escape = (text: string): string => {
      return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
    };

    const nombre = escape(clinica.nombre);
    const direccion = escape(clinica.direccion);
    const ciudad = escape(clinica.ciudad);
    const telefono = escape(clinica.telefono);
    const horario = escape(clinica.horario);

    const especialidades = clinica.especialidades
      .map((esp) => `• ${escape(esp)}`)
      .join("\n");

    return `
🏥 *${nombre}*

📍 *Dirección:* ${direccion}
🏙 *Ciudad:* ${ciudad}
📞 *Teléfono:* ${telefono}
⏰ *Horario:* ${horario}
${clinica.emergencia24h ? "🚨 *Servicio de Emergencia 24h*\n" : ""}
👨‍⚕️ *Especialidades:*
${especialidades}
    `.trim();
  }

  private formatPhoneNumber(telefono: string): string {
    // Limpiamos el número de teléfono para el enlace
    const cleanNumber = telefono
      .replace(/\D/g, "") // Elimina todo lo que no sea número
      .replace(/^0/, "58"); // Reemplaza el 0 inicial por 58 (código de Venezuela)

    return `tel:+${cleanNumber}`;
  }
}
