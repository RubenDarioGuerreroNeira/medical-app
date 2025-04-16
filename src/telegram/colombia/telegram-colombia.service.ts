import { Injectable, Inject, Logger } from "@nestjs/common";
import { TelegramBaseService } from "../services/telegram-base.service";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import { HttpService } from "@nestjs/axios";
import axios from "axios"; // Importar axios directamente

@Injectable()
export class TelegramColombiaService extends TelegramBaseService {
  // private readonly baseUrl = "https://www.datos.gov.co/resource/gt2j-8ykr.json";

  private readonly baseUrl = "https://www.datos.gov.co/resource/g973-bms9.json"; // Directorio de Instituciones Prestadoras de Salud

  private readonly dataSources = [
    "https://data.seattle.gov/resource/jguv-t9rb.json", //  COLOQUE LA API DE SEATLE COMO EJEMPLO Directorio IPS
    "https://www.datos.gov.co/resource/7ahu-ncpk.json", // Prestadores de salud
    "https://www.datos.gov.co/resource/qhpu-8ixx.json", // Otro posible dataset
    "https://www.datos.gov.co/resource/5n4t-3unn.json", // Otro posible dataset
    "https://www.datos.gov.co/resource/xawk-sqdk.json", // Otro posible dataset
  ];

  private async fetchWithRetry(
    url: string,
    params: any,
    retries = 3
  ): Promise<any> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.get(url, {
          params,
          timeout: 10000,
          headers: {
            Accept: "application/json",
            "User-Agent": "TelegramBot/1.0",
          },
        });
        return response.data;
      } catch (error) {
        if (
          i === retries - 1 ||
          (error.response && error.response.status !== 404)
        ) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    throw new Error("Max retries reached");
  }

  private async getCentersByCity(city: string): Promise<any[]> {
    const normalizedCity = city
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());

    this.logger.log(`Buscando centros médicos en ${normalizedCity}`);

    // Intentar con cada fuente de datos
    for (const dataSource of this.dataSources) {
      try {
        // Primero verificar si el dataset existe y obtener su estructura
        this.logger.log(`Probando fuente de datos: ${dataSource}`);

        try {
          // Verificar si el dataset existe
          const testData = await this.fetchWithRetry(dataSource, { $limit: 1 });

          if (!testData || testData.length === 0) {
            this.logger.warn(
              `Dataset ${dataSource} existe pero está vacío, probando siguiente fuente`
            );
            continue;
          }

          // Registrar la estructura para depuración
          this.logger.log(
            `Estructura de datos: ${JSON.stringify(Object.keys(testData[0]))}`
          );

          // Buscar la columna correcta para el municipio/ciudad
          const possibleColumns = [
            "municipio",
            "ciudad_municipio",
            "ciudad",
            "nombre_municipio",
            "mun_nombre",
          ];
          let cityColumn = null;

          for (const col of possibleColumns) {
            if (testData[0].hasOwnProperty(col)) {
              cityColumn = col;
              break;
            }
          }

          // Intentar búsqueda por columna específica
          if (cityColumn) {
            this.logger.log(
              `Usando columna ${cityColumn} para filtrar por ciudad`
            );
            try {
              const data = await this.fetchWithRetry(dataSource, {
                $where: `${cityColumn}='${normalizedCity}'`,
                $limit: 100,
              });

              if (data && data.length > 0) {
                this.logger.log(
                  `Encontrados ${data.length} centros médicos en ${dataSource}`
                );
                return data;
              } else {
                this.logger.warn(
                  `No se encontraron resultados usando columna ${cityColumn}`
                );
              }
            } catch (error) {
              this.logger.warn(`Error al buscar por columna: ${error.message}`);
            }
          }

          // Si no se encontró por columna específica, intentar búsqueda de texto
          this.logger.log(
            `Intentando búsqueda de texto simple en ${dataSource}`
          );
          const textSearchData = await this.fetchWithRetry(dataSource, {
            $q: normalizedCity,
            $limit: 100,
          });

          if (textSearchData && textSearchData.length > 0) {
            this.logger.log(
              `Encontrados ${textSearchData.length} centros médicos con búsqueda de texto`
            );
            return textSearchData;
          } else {
            this.logger.warn(
              `No se encontraron resultados con búsqueda de texto`
            );
          }
        } catch (error) {
          if (error.response && error.response.status === 404) {
            this.logger.warn(
              `Dataset ${dataSource} no encontrado, probando siguiente fuente`
            );
          } else {
            this.logger.error(
              `Error al consultar ${dataSource}: ${error.message}`
            );
          }
        }
      } catch (error) {
        this.logger.error(`Error general con ${dataSource}: ${error.message}`);
      }
    }

    // Si llegamos aquí, ninguna fuente de datos funcionó
    this.logger.error(
      `No se pudo obtener datos de ninguna fuente para ${normalizedCity}`
    );
    return [];
  }

  private formatearCentroMedico(centro: any): string {
    // Determinar dinámicamente los campos disponibles
    const nombre =
      centro.nombre_prestador ||
      centro.nombre ||
      centro.razon_social ||
      "Centro médico";
    const direccion =
      centro.direccion ||
      centro.dir_prestador ||
      centro.direccion_prestador ||
      "No disponible";
    const municipio =
      centro.municipio ||
      centro.ciudad_municipio ||
      centro.mun_nombre ||
      "No disponible";
    const tipo =
      centro.clase_prestador ||
      centro.naturaleza_juridica ||
      centro.nivel_atencion ||
      "No disponible";
    const telefono =
      centro.telefono ||
      centro.tel_prestador ||
      centro.numero_telefono ||
      "No disponible";

    return (
      `*${this.escapeMarkdown(nombre)}*\n` +
      `📍 *Dirección:* ${this.escapeMarkdown(direccion)}\n` +
      `🏙️ *Municipio:* ${this.escapeMarkdown(municipio)}\n` +
      `🏥 *Tipo:* ${this.escapeMarkdown(tipo)}\n` +
      `📞 *Teléfono:* ${this.escapeMarkdown(telefono)}`
    );
  }

  constructor(
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    private readonly httpService: HttpService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
    this.logger.log("TelegramColombiaService inicializado");
  }

  async mostrarCentrosMedicosColombia(
    chatId: number,
    ciudad: string
  ): Promise<void> {
    try {
      await this.bot.sendMessage(
        chatId,
        `Buscando centros médicos en ${ciudad}, Colombia...`
      );

      // Usar el método local en lugar del servicio externo
      const centros = await this.getCentersByCity(ciudad);

      if (!centros || centros.length === 0) {
        await this.bot.sendMessage(
          chatId,
          `No se encontraron centros médicos en ${ciudad}. Intenta con otra ciudad.`
        );
        return;
      }

      // Mostrar los primeros 5 centros (o menos si hay menos)
      const centrosAMostrar = centros.slice(0, 5);

      for (const centro of centrosAMostrar) {
        const mensaje = this.formatearCentroMedico(centro);
        await this.bot.sendMessage(chatId, mensaje, { parse_mode: "Markdown" });
      }

      // Si hay más centros, ofrecer ver más
      if (centros.length > 5) {
        await this.bot.sendMessage(
          chatId,
          `Se encontraron ${centros.length} centros médicos. ¿Deseas ver más?`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Ver más centros",
                    callback_data: `ver_mas_centros_${ciudad}`,
                  },
                  { text: "Volver al menú", callback_data: "menu_principal" },
                ],
              ],
            },
          }
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          "Estos son todos los centros médicos encontrados.",
          {
            reply_markup: {
              inline_keyboard: [
                [{ text: "Volver al menú", callback_data: "menu_principal" }],
              ],
            },
          }
        );
      }
    } catch (error) {
      this.logger.error("Error al buscar centros médicos:", error);
      await this.bot.sendMessage(
        chatId,
        "Ocurrió un error al buscar centros médicos. Por favor, intenta nuevamente."
      );
    }
  }

  async solicitarCiudadColombia(chatId: number): Promise<void> {
    const mensaje = await this.bot.sendMessage(
      chatId,
      "Por favor, escribe el nombre de la ciudad de Colombia donde deseas buscar centros médicos:",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, mensaje.message_id, async (msg) => {
      if (msg.text) {
        await this.mostrarCentrosMedicosColombia(chatId, msg.text.trim());
      }
    });
  }
}
