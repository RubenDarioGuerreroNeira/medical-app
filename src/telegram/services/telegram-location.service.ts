import { Injectable, Inject } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import { OSMService } from "../farmacias-maps.service";
import { ClinicasVenezuelaService } from "../centros-hospitalarios.service";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import {TelegramMenuService} from "./telegram-menu.service";
interface Location {
  latitude: number;
  longitude: number;
}

@Injectable()
export class TelegramLocationService extends TelegramBaseService {
  constructor(
    private osmService: OSMService,
    private clinicasVenezuelaService: ClinicasVenezuelaService,
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    private menuService:TelegramMenuService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

  async solicitarUbicacion(
    chatId: number,
    tipo: "farmacia" | "clinica"
  ): Promise<void> {
    const mensaje =
      tipo === "farmacia"
        ? "Para encontrar Las Farmacias más cercanas, necesito tu ubicación actual."
        : "Para encontrar Los Centros de Atención Médica más cercanos, necesito tu ubicación actual.";

    await this.bot.sendMessage(
      chatId,
      `${mensaje}\nPor favor, comparte tu ubicación usando el botón de abajo:`,
      {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📍 Compartir ubicación",
                request_location: true,
              },
            ],
            [
              {
                text: "❌ Cancelar",
              },
            ],
          ],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

    this.setupLocationHandler(chatId, tipo);
  }

  // private setupLocationHandler(
  //   chatId: number,
  //   tipo: "farmacia" | "clinica"
  // ): void {
  //   const messageHandler = async (msg: TelegramBot.Message) => {
  //     try {
  //       if (msg.chat.id !== chatId) return;

  //       if (msg.location) {
  //         this.bot.removeListener("message", messageHandler);
  //         await this.procesarUbicacion(chatId, msg.location, tipo);
  //       } else if (msg.text === "❌ Cancelar") {
  //         this.bot.removeListener("message", messageHandler);
  //         await this.cancelarBusqueda(chatId);
  //       }
  //     } catch (error) {
  //       this.logger.error("Error in location handler:", error);
  //       await this.handleLocationError(chatId);
  //       this.bot.removeListener("message", messageHandler);
  //     }
  //   };

  //   this.bot.on("message", messageHandler);
  // }

  private setupLocationHandler(
    chatId: number,
    tipo: "farmacia" | "clinica"
  ): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (!msg.location) {
        if (msg.text === "❌ Cancelar") {
          // Eliminar el teclado al cancelar
          await this.bot.sendMessage(chatId, "Búsqueda cancelada.", {
            reply_markup: { remove_keyboard: true },
          });

          await this.menuService.mostrarMenuPrincipal(chatId);
          this.bot.removeListener("message", messageHandler);
          return;
        }
        return;
      }

      // Remover el listener antes de procesar la ubicación
      this.bot.removeListener("message", messageHandler);

      // Procesar la ubicación
      await this.procesarUbicacion(chatId, msg.location, tipo);
    };

    this.bot.on("message", messageHandler);
  }

  private async procesarUbicacion(
    chatId: number,
    location: Location,
    tipo: "farmacia" | "clinica"
  ): Promise<void> {
    const searchingMessage = await this.bot.sendMessage(
      chatId,
      tipo === "farmacia"
        ? "Buscando Farmacias Cercanas a tu ubicación... 🔍"
        : "Buscando Centros de Atención Médica Cercanos a tu ubicación... 🔍"
    );

    try {
      // Eliminar el teclado de compartir ubicación inmediatamente
      await this.bot.sendMessage(chatId, "Procesando tu ubicación...", {
        reply_markup: { remove_keyboard: true },
      });

      if (tipo === "farmacia") {
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
    location: Location
  ): Promise<void> {
    const farmacias = await this.osmService.buscarFarmaciaCercana(
      location.latitude,
      location.longitude
    );

    if (!farmacias || farmacias.length === 0) {
      await this.enviarMensajeNoResultados(chatId, "farmacias");
      return;
    }

    await this.enviarResultadosFarmacias(chatId, farmacias);
  }

  private async buscarClinicasCercanas(
    chatId: number,
    location: Location
  ): Promise<void> {
    const clinicas = await this.osmService.buscarClinicaCercana(
      location.latitude,
      location.longitude
    );

    if (!clinicas || clinicas.length === 0) {
      await this.enviarMensajeNoResultados(chatId, "centros médicos");
      return;
    }

    await this.enviarResultadosClinicas(chatId, clinicas);
  }

  private async enviarResultadosFarmacias(
    chatId: number,
    farmacias: any[]
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `Se encontraron ${farmacias.length} farmacias cercanas:`,
      {
        reply_markup: { remove_keyboard: true },
      }
    );

    for (const farmacia of farmacias.slice(0, 5)) {
      const nombre = farmacia.name || "Farmacia sin nombre";
      const direccion = farmacia.address || "Dirección no disponible";
      const distancia = farmacia.distance
        ? `${farmacia.distance.toFixed(2)} km`
        : "Distancia desconocida";

      const mensaje = `🏥 *${this.escapeMarkdown(
        nombre
      )}*\n📍 Dirección: ${this.escapeMarkdown(
        direccion
      )}\n🚶 Distancia: ${distancia}`;

      if (farmacia.lat && farmacia.lon) {
        await this.bot.sendLocation(chatId, farmacia.lat, farmacia.lon);
        await this.bot.sendMessage(chatId, mensaje, {
          parse_mode: "MarkdownV2",
        });
      } else {
        await this.bot.sendMessage(chatId, mensaje, {
          parse_mode: "MarkdownV2",
        });
      }
    }

    await this.bot.sendMessage(
      chatId,
      "Aquí tienes las farmacias más cercanas a tu ubicación.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
          remove_keyboard: true,
        },
      }
    );
  }

  private async enviarResultadosClinicas(
    chatId: number,
    clinicas: any[]
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `Se encontraron ${clinicas.length} centros médicos cercanos:`,
      {
        reply_markup: { remove_keyboard: true },
      }
    );

    for (const clinica of clinicas.slice(0, 5)) {
      const nombre = clinica.name || "Centro médico sin nombre";
      const direccion = clinica.address || "Dirección no disponible";
      const distancia = clinica.distance
        ? `${clinica.distance.toFixed(2)} km`
        : "Distancia desconocida";

      const mensaje = `🏥 *${this.escapeMarkdown(
        nombre
      )}*\n📍 Dirección: ${this.escapeMarkdown(
        direccion
      )}\n🚶 Distancia: ${distancia}`;

      if (clinica.lat && clinica.lon) {
        await this.bot.sendLocation(chatId, clinica.lat, clinica.lon);
        await this.bot.sendMessage(chatId, mensaje, {
          parse_mode: "MarkdownV2",
        });
      } else {
        await this.bot.sendMessage(chatId, mensaje, {
          parse_mode: "MarkdownV2",
        });
      }
    }

    await this.bot.sendMessage(
      chatId,
      "Aquí tienes los centros médicos más cercanos a tu ubicación.",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
          remove_keyboard: true,
        },
      }
    );
  }

  private async enviarMensajeNoResultados(
    chatId: number,
    tipo: string
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      `No se encontraron ${tipo} cercanos a tu ubicación.`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔍 Ampliar búsqueda",
                callback_data: `ampliar_busqueda_${tipo}`,
              },
            ],
            [
              {
                text: "🔙 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
          remove_keyboard: true,
        },
      }
    );
  }

  private async cancelarBusqueda(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, "Búsqueda cancelada", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    // Volver al menú principal
    await this.mostrarMenuPrincipal(chatId);
  }

  private async handleLocationError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Lo siento, ocurrió un error al procesar tu ubicación. Por favor, intenta nuevamente.",
      {
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

  // Este método debe estar en TelegramBaseService, pero lo incluyo aquí por si acaso
  private async mostrarMenuPrincipal(chatId: number): Promise<void> {
    // Implementación básica, debería usar el servicio de menú
    await this.bot.sendMessage(
      chatId,
      "¡Bienvenido al Asistente Médico Virtual! ¿En qué puedo ayudarte?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🏥 Farmacias Cercanas",
                callback_data: "solicitar_ubicacion_farmacia",
              },
            ],
            [
              {
                text: "👨‍🔬 Centros Médicos Cercanos",
                callback_data: "mostrarCentrosCercanos",
              },
            ],
            [
              {
                text: "🩺 Consulta Médica con IA",
                callback_data: "consulta_medica",
              },
            ],
            [
              {
                text: "🙋‍♂️ Recordatorios de Medicamentos",
                callback_data: "recordatorios",
              },
            ],
          ],
        },
      }
    );
  }
}
