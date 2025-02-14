// telegram.service.ts
import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { GeminiAIService } from "../Gemini/gemini.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { Clinica } from "./intrfaces/interface-clinicas";
import { Farmacia } from "./intrfaces/osm.interface";
import { OSMService } from "./farmacias-maps.service";
import {
  AppointmentNotification,
  TelegramKeyboard,
} from "./telegram.interfaces";
import {
  Location,
  OSMPlace,
  OSMStatus,
  NominatimResponse,
  PharmacyResponse,
} from "./intrfaces/osm.interface";
import { TelegramLocationHandler } from "./telegram-location-handler.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);
  private readonly nominatimBaseUrl = "https://nominatim.openstreetmap.org";
  private locationRequestType: { [key: number]: "farmacia" | "clinica" } = {};

  constructor(
    private configService: ConfigService,
    private geminiService: GeminiAIService,
    private clinicasVenezuelaService: ClinicasVenezuelaService,
    private osmService: OSMService,
    private locationHandler: TelegramLocationHandler,
    private messageFormatter: TelegramMessageFormatter,
    private errorHandler: TelegramErrorHandler
  ) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    this.bot = new TelegramBot(token, { polling: true });
    this.initializeBot();
    this.agregarComandosClinica(this.bot);

    // manejador para callbacks queries
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }
  private initializeBot(): void {
    this.setupCommands();
    this.setupCallbackHandler();
    this.setupMessageHandler();
    this.setupErrorHandler();
  }

  //-------------------------------------------------- CALLBACKS-----------------------------------------
  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    const actionHandlers = {
      // solicitar_ubicacion_farmacia: () =>
      //   this.solicitarUbicacionFarmacia(chatId),
      consulta_medica: () => this.iniciarConsultaMedica(chatId),
      solicitar_ubicacion_farmacia: () => this.solicitarUbicacionFarma(chatId),
      buscar_farmacias_tachira: () => this.enviarMenuPrincipal(chatId),
      mostrarCentrosCercanos: () => this.solicitarUbicacion(chatId),
      contacto: () => this.mostrarContacto(chatId),
      menu_principal: () => this.mostrarMenuPrincipal(chatId),
    };

    if (data in actionHandlers) {
      await actionHandlers[data]();
    }
  }

  //-----------farmacias-----------------

  // Botones de Buscar Farmacias
  private async enviarMenuPrincipal(chatId: number): Promise<void> {
    const mensaje = "¿Qué deseas buscar?";
    const opciones = {
      reply_markup: {
        inline_keyboard: [
          // [
          //   {
          //     text: "🏥 Buscar farmacias en Táchira",
          //     callback_data: "buscar_farmacias_tachira",
          //   },
          // ],
          [
            {
              text: "📍 Buscar farmacias cercanas a mi ubicación",
              callback_data: "solicitar_ubicacion_farmacia",
            },
          ],
          [
            {
              text: "❓ Ayuda",
              callback_data: "ayuda",
            },
          ],
        ],
      },
    };

    await this.bot.sendMessage(chatId, mensaje, opciones);
  }

  // manejador de solicitudes

  private async solicitarUbicacionFarmacia(chatId: number): Promise<void> {
    try {
      const mensaje =
        "Por favor, comparte tu ubicación actual para buscar farmacias cercanas.";
      this.locationRequestType[chatId] = "farmacia";

      await this.bot.sendMessage(chatId, mensaje, {
        reply_markup: {
          keyboard: [
            [
              {
                text: "📍 Compartir mi ubicación",
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
      });
    } catch (error) {
      await this.errorHandler.handleServiceError(
        this.bot,
        error,
        "solicitarUbicacionFarmacia",
        chatId
      );
    }
  }

  // Método para cancelar la búsqueda y volver al menú principal
  private async cancelarBusqueda(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, "Búsqueda cancelada", {
      reply_markup: {
        remove_keyboard: true,
      },
    });
    //  método que muestra el menú principal
    await this.mostrarMenuPrincipal(chatId); // Volvemos al menú principal
  }

  // Mejora del manejador de errores
  private async fetchWithRetry(url: string, retries = 3): Promise<Response> {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
      }
    }
    throw new Error("Max retries reached");
  }

  // Hacemos el método genérico para manejar diferentes tipos de respuesta
  private async validateResponse<T>(response: Response): Promise<T> {
    const data = (await response.json()) as T;

    if (!data) {
      throw new Error(
        `Error en la respuesta de OpenStreetMap: ${JSON.stringify(data)}`
      );
    }

    const status = this.determineStatus(data);
    if (status !== OSMStatus.OK) {
      switch (status) {
        case OSMStatus.ZERO_RESULTS:
          throw new HttpException(
            "No se encontraron resultados",
            HttpStatus.NOT_FOUND
          );
        case OSMStatus.REQUEST_DENIED:
          throw new HttpException(
            "Solicitud denegada por OpenStreetMap",
            HttpStatus.FORBIDDEN
          );
        default:
          throw new Error(`OpenStreetMap API Error: ${status}`);
      }
    }

    return data;
  }

  // status de respuesta de osm map
  private determineStatus(data: any): OSMStatus {
    // Si la respuesta es un array vacío
    if (Array.isArray(data) && data.length === 0) {
      return OSMStatus.ZERO_RESULTS;
    }

    // Si hay un error explícito en la respuesta
    if (data.error) {
      if (data.error.includes("permission denied")) {
        return OSMStatus.REQUEST_DENIED;
      }
      return OSMStatus.INVALID_REQUEST;
    }

    // Si la respuesta tiene datos válidos
    if (
      (Array.isArray(data) && data.length > 0) || // Para búsquedas que devuelven arrays
      data.place_id // Para búsquedas que devuelven un solo lugar
    ) {
      return OSMStatus.OK;
    }

    // Si no podemos determinar el estado
    return OSMStatus.UNKNOWN_ERROR;
  }

  private validateCoordinates(latitude: number, longitude: number): void {
    if (
      !latitude ||
      !longitude ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new HttpException("Coordenadas inválidas", HttpStatus.BAD_REQUEST);
    }
  }

  // manejador de ubicacion de centros medicos local osea esta funcionnno esta separada
  private setupLocationHandler(chatId: number): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      try {
        if (msg.chat.id !== chatId) return;

        if (msg.location) {
          this.bot.removeListener("message", messageHandler);
          await this.bot.sendMessage(
            chatId,
            "Procesando tu ubicación, para la busqueda de Entidades Cercanas a tu ubicación ...",
            {
              reply_markup: { remove_keyboard: true },
            }
          );

          // Usar el método unificado mostrarCentrosCercanos
          await this.mostrarCentrosCercanos(this.bot, chatId, msg.location);
        } else if (msg.text === "❌ Cancelar") {
          this.bot.removeListener("message", messageHandler);

          await this.bot.sendMessage(chatId, "Búsqueda cancelada.", {
            reply_markup: { remove_keyboard: true },
          });
          await this.mostrarMenuPrincipal(chatId);
          this.bot.removeListener("message", messageHandler);
        }
      } catch (error) {
        this.logger.error("Error in location handler:", error);
        await this.handleLocationError(chatId);
        this.bot.removeListener("message", messageHandler);
      }
    };

    this.bot.on("message", messageHandler);
  }

  private setupLocationHandlerFarma(chatId: number): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      try {
        if (msg.chat.id !== chatId) return;

        if (msg.location) {
          this.bot.removeListener("message", messageHandler);
          await this.bot.sendMessage(
            chatId,
            "Procesando tu ubicación, para la busqueda de Farmacias Cercanas a tu ubicación ...",
            {
              reply_markup: { remove_keyboard: true },
            }
          );

          // Usar el método unificado mostrarCentrosCercanos
          await this.mostrarFarmaCercanos(this.bot, chatId, msg.location);
        } else if (msg.text === "❌ Cancelar") {
          this.bot.removeListener("message", messageHandler);

          await this.bot.sendMessage(chatId, "Búsqueda cancelada.", {
            reply_markup: { remove_keyboard: true },
          });
          await this.mostrarMenuPrincipal(chatId);
          this.bot.removeListener("message", messageHandler);
        }
      } catch (error) {
        this.logger.error("Error in location handler:", error);
        await this.handleLocationError(chatId);
        this.bot.removeListener("message", messageHandler);
      }
    };

    this.bot.on("message", messageHandler);
  }

  // MANEJADOR DE UBICACION
  private async mostrarCentrosCercanos(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location
  ): Promise<void> {
    try {
      // Mostrar mensaje de "buscando..."
      const searchingMessage = await bot.sendMessage(
        chatId,
        "Buscando centros Entidades Cercanas a tu ubicación... 🔍"
      );

      const clinica = await this.osmService.buscarClinicaCercana(
        location.latitude,
        location.longitude
      );

      // Eliminar mensaje de "buscando..."
      await bot.deleteMessage(chatId, searchingMessage.message_id);

      if (!clinica) {
        await bot.sendMessage(
          chatId,
          "No se encontraron centros médicos cercanos a tu ubicación en un radio de 1km.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔍 Ampliar búsqueda",
                    callback_data: "ampliar_busqueda",
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
          }
        );
        return;
      }

      await this.enviarInformacionClinica(bot, chatId, clinica);
    } catch (error) {
      this.logger.error(
        "Error al obtener información de los centros cercanos:",
        error
      );
      await this.handleLocationError(chatId);
    }
  }

  private async mostrarFarmaCercanos(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location
  ): Promise<void> {
    try {
      // Mostrar mensaje de "buscando..."
      const searchingMessage = await bot.sendMessage(
        chatId,
        "Buscando Farmacias Cercanas a tu ubicación... 🔍"
      );

      const farmaciaResponse = await this.osmService.buscarFarmaciaCercana(
        location.latitude,
        location.longitude
      );

      // Eliminar mensaje de "buscando..."
      await bot.deleteMessage(chatId, searchingMessage.message_id);

      if (!farmaciaResponse) {
        await bot.sendMessage(
          chatId,
          "No se encontraron centros médicos cercanos a tu ubicación en un radio de 1km.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔍 Ampliar búsqueda",
                    callback_data: "ampliar_busqueda",
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
          }
        );
        return;
      }
      // Transformar PharmacyResponse a Farmacia
      const farmacia: Farmacia = {
        ...farmaciaResponse,
        horario: farmaciaResponse.horario || "Horario no disponible",
      };
      await this.enviarInformacionFarma(bot, chatId, farmacia);
    } catch (error) {
      this.logger.error(
        "Error al obtener información de los centros cercanos:",
        error
      );
      await this.handleLocationError(chatId);
    }
  }

  private async enviarInformacionFarma(
    bot: TelegramBot,
    chatId: number,
    farmacia: Farmacia
  ): Promise<void> {
    try {
      if (farmacia.coordenadas?.lat && farmacia.coordenadas?.lng) {
        await bot.sendLocation(
          chatId,
          farmacia.coordenadas.lat,
          farmacia.coordenadas.lng
        );
      }

      const message = this.messageFormatter.formatFarmaMessage(farmacia);
      const phoneUrl = this.messageFormatter.formatPhoneNumber(
        farmacia.telefono || ""
      );

      await bot.sendMessage(chatId, message, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Contactar",
                url: phoneUrl,
              },
              {
                text: "🗺 Cómo llegar",
                url: `https://www.google.com/maps/dir/?api=1&destination=${farmacia.coordenadas.lat},${farmacia.coordenadas.lng}`,
              },
            ],
            [
              {
                text: "🔍 Buscar otro centro",
                callback_data: "buscar_otro_centro",
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
      this.logger.error("Error enviando información de la clínica:", error);
      await this.handleClinicError(bot, chatId);
    }
  }

  // manejador de callback queries
  private setupCallbackHandler(): void {
    this.bot.on("callback_query", async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;

      // await this.handleCallbackAction(action, chatId);
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });
  }

  // SOLICITAR UBICACION PARA MOSTRAR CENTROS
  private async solicitarUbicacion(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Para encontrar Los Centros de Atención Médica más cercanos, necesito tu ubicación actual. " +
        "Por favor, comparte tu ubicación usando el botón de abajo:",
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

    // Configurar el manejador de ubicación
    this.setupLocationHandler(chatId);
  }

  private async solicitarUbicacionFarma(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Para encontrar Las Farmacias más cercanas, necesito tu ubicación actual. " +
        "Por favor, comparte tu ubicación usando el botón de abajo:",
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

    // Configurar el manejador de ubicación
    this.setupLocationHandlerFarma(chatId);
  }

  // capturo el nombre del usuario y el chatId , luego le muestro ek el menú principal
  private setupCommands(): void {
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const userName = msg.from.first_name;
      this.logger.log(`Nuevo usuario: ${userName}, ChatID: ${chatId}`);
      await this.mostrarMenuPrincipal(chatId, userName);
    });

    this.bot.onText(/\/help/, (msg) => {
      const chatId = msg.chat.id;
      this.mostrarAyuda(chatId);
    });
  }

  // --------------------IA------------------------
  // manejador de FOTOS DE LA IA
  private async handleImageMessage(
    chatId: number,
    msg: TelegramBot.Message
  ): Promise<void> {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      if (!msg.photo || msg.photo.length === 0) {
        await this.bot.sendMessage(chatId, "No se pudo procesar la imagen.");
        return;
      }

      // Get the largest photo size
      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;

      // Get the download link for the photo
      const fileLink = await this.bot.getFileLink(fileId);

      // Download the image from Telegram servers
      const imageResponse = await fetch(fileLink);

      // Validar el tipo MIME
      const contentType = imageResponse.headers.get("content-type");
      const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
      const mimeType =
        contentType && supportedMimeTypes.includes(contentType)
          ? contentType
          : "image/jpeg";

      // Validar que la respuesta sea exitosa
      if (!imageResponse.ok) {
        throw new Error(
          `Error al descargar la imagen: ${imageResponse.statusText}`
        );
      }

      // Convert the response to ArrayBuffer first
      const arrayBuffer = await imageResponse.arrayBuffer();

      // Validar el tamaño de la imagen (máximo 4MB)
      if (arrayBuffer.byteLength > 4 * 1024 * 1024) {
        await this.bot.sendMessage(
          chatId,
          "La imagen es demasiado grande. Por favor, envía una imagen menor a 4MB.",
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
        return;
      }

      // Then convert to Buffer
      const imageBuffer = Buffer.from(arrayBuffer);

      // Log para debugging
      this.logger.debug(`Procesando imagen con MIME type: ${mimeType}`);
      this.logger.debug(`Tamaño de la imagen: ${imageBuffer.length} bytes`);

      // Extract text from the image using Gemini service
      const extractedText = await this.geminiService.extractTextFromImage(
        imageBuffer,
        mimeType
      );

      if (extractedText) {
        await this.bot.sendMessage(
          chatId,
          "Texto extraído de la imagen:\n\n" + extractedText,
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
      } else {
        await this.bot.sendMessage(
          chatId,
          "No se pudo extraer texto de la imagen.",
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
    } catch (error) {
      this.logger.error("Error handling image message:", error);

      // Mensaje de error más específico basado en el tipo de error
      let errorMessage =
        "Error al procesar la imagen. Por favor, intenta nuevamente más tarde.";

      if (error instanceof Error) {
        if (error.message.includes("MIME")) {
          errorMessage =
            "Formato de imagen no soportado. Por favor, envía una imagen en formato JPEG, PNG o WEBP.";
        } else if (error.message.includes("tamaño")) {
          errorMessage =
            "La imagen es demasiado grande. Por favor, envía una imagen menor a 4MB.";
        }
      }

      await this.bot.sendMessage(chatId, errorMessage, {
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
      });
    }
  }

  // --------------------ERROR------------------------
  private setupErrorHandler(): void {
    this.bot.on("error", (error) => {
      this.logger.error("Error en el bot de Telegram:", error);
    });
  }

  // MANEJO DE MENSAJES AL USUARIO CUANDO INGRESA DATOS AL TEXTBOX
  private setupMessageHandler(): void {
    this.bot.on("message", async (msg) => {
      const chatId = msg.chat.id;

      try {
        // Manejar cancelación
        if (msg.text === "❌ Cancelar") {
          await this.cancelarBusqueda(chatId);
          return;
        }

        // Manejar mensajes de texto generales
        if (msg.text && !msg.text.startsWith("/")) {
          // Si hay una consulta médica activa, manejarla

          await this.handleGeneralMessage(chatId);
          return;
        }

        // Manejar fotos
        if (msg.photo) {
          await this.handleImageMessage(chatId, msg);
          return;
        }
      } catch (error) {
        await this.errorHandler.handleServiceError(
          this.bot,
          error,
          "setupMessageHandler",
          chatId
        );
      }
    });
  }

  // manejador de mensajes  al usuario invitandolo a interactuar con el menu
  private async handleGeneralMessage(chatId: number): Promise<void> {
    try {
      await this.bot.sendMessage(
        chatId,
        "Por favor, usa los botones del menú para interactuar conmigo.",
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
    } catch (error) {
      await this.errorHandler.handleServiceError(
        this.bot,
        error,
        "handleGeneralMessage",
        chatId
      );
    }
  }

  //------------MENU PRINCIPAL -------------------------
  private getMainMenuKeyboard(): TelegramKeyboard {
    return {
      inline_keyboard: [
        [
          {
            text: "🏥  Farmacias Cercanas \nBuscar",
            callback_data: "solicitar_ubicacion_farmacia",
          },
        ],
        [
          {
            text: "👨‍🔬  Centros de Atención Médica Cercanos \nBuscar ",
            callback_data: "mostrarCentrosCercanos",
          },
        ],
        [
          {
            text: "🩺 Preguntale a Nuestra IA ",
            callback_data: "consulta_medica",
          },
        ],
        // [
        //   {
        //     text: "⛺ Farmacias en Táchira*",
        //     callback_data: "buscar_farmacias_tachira",
        //   },
        // ],
        // [
        //   { text: "📅 Ver mis citas(Prueba)", callback_data: "ver_citas" },
        //   { text: "➕ Nueva cita", callback_data: "nueva_cita" },
        // ],
        [
          //   { text: "❌ Cancelar cita(Prueba)", callback_data: "cancelar_cita" },
          { text: "📞 Contacto", callback_data: "contacto" },
        ],
      ],
    };
  }

  //*** mensaje de bienvenida al usuario
  private async mostrarMenuPrincipal(
    chatId: number,
    userName?: string
  ): Promise<void> {
    const welcomeMessage = userName
      ? `¡Hola ${userName}! 👋\n\n`
      : "¡Bienvenido! 👋\n\n";

    await this.bot.sendMessage(
      chatId,
      welcomeMessage + "Por favor, selecciona una opción:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }

  // pr

  // mostrar ayuda
  private async mostrarAyuda(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📋 Comandos disponibles:\n\n" +
        "/start - Iniciar el bot\n" +
        "/help - Ver esta lista de comandos\n\n" +
        "También puedes usar los botones del menú principal:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }

  // mensajes de error
  async sendMessage(chatId: number, message: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      this.logger.error("Error enviando mensaje:", error);
      return false;
    }
  }

  // iniciar consulta médica con ia cuando la pregunta es un texto
  private async iniciarConsultaMedica(chatId: number): Promise<void> {
    const sentMessage = await this.bot.sendMessage(
      chatId,
      "Por favor, escribe tu pregunta médica, Toma una foto de lo que deseas saber, ó Carga una foto desde tu galería:",
      {
        reply_markup: {
          force_reply: true, // Forzar al usuario a responder
          selective: true,
        },
      }
    );

    // Esperar la respuesta del usuario
    this.bot.onReplyToMessage(chatId, sentMessage.message_id, async (msg) => {
      if (msg.text) {
        // Primero enviamos el mensaje de espera
        const waitingMessage = await this.bot.sendMessage(
          chatId,
          "🤔 Estoy analizando tu consulta, por favor espera un momento..."
        );

        // Procesamos la pregunta médica
        await this.procesarPreguntaMedica(chatId, msg.text);

        // Eliminamos el mensaje de espera después de procesar la respuesta
        await this.bot.deleteMessage(chatId, waitingMessage.message_id);
      } else {
        await this.bot.sendMessage(
          chatId,
          "Estoy Procesando la Información para poder responder ."
        );
      }
    });
  }

  // procesar pregunta envaindosela a Gemini
  private async procesarPreguntaMedica(
    chatId: number,
    pregunta: string
  ): Promise<void> {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      const respuesta = await this.geminiService.generateMedicalResponse(
        pregunta
      );

      const MAX_LENGTH = 4096; // Define el valor de MAX_LENGTH según tus necesidades

      if (respuesta.length > MAX_LENGTH) {
        const chunks: string[] =
          respuesta.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g")) || [];
        for (const chunk of chunks) {
          const options: TelegramBot.SendMessageOptions = {
            parse_mode: "MarkdownV2",
            reply_markup:
              chunks.indexOf(chunk) === chunks.length - 1
                ? {
                    inline_keyboard: [
                      [
                        {
                          text: "🔙 Volver al menú principal",
                          callback_data: "menu_principal",
                        },
                      ],
                    ],
                  }
                : undefined,
          };
          await this.bot.sendMessage(chatId, chunk, options);
        }
      } else {
        const options: TelegramBot.SendMessageOptions = {
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
        };
        await this.bot.sendMessage(chatId, respuesta, options);
      }
    } catch (error) {
      this.logger.error("Error processing medical question:", error);
      const errorOptions: TelegramBot.SendMessageOptions = {
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
      };
      await this.bot.sendMessage(
        chatId,
        "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente más tarde.",
        errorOptions
      );
    }
  }

  //-------------------NUEVO METODOS DE CLINICAS CERCANAS --------------------------------

  private async enviarInformacionClinica(
    bot: TelegramBot,
    chatId: number,
    clinica: Clinica
  ): Promise<void> {
    try {
      if (clinica.coordenadas?.lat && clinica.coordenadas?.lng) {
        await bot.sendLocation(
          chatId,
          clinica.coordenadas.lat,
          clinica.coordenadas.lng
        );
      }

      const message = this.messageFormatter.formatClinicMessage(clinica);
      const phoneUrl = this.messageFormatter.formatPhoneNumber(
        clinica.telefono || ""
      );

      await bot.sendMessage(chatId, message, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Contactar",
                url: phoneUrl,
              },
              {
                text: "🗺 Cómo llegar",
                url: `https://www.google.com/maps/dir/?api=1&destination=${clinica.coordenadas.lat},${clinica.coordenadas.lng}`,
              },
            ],
            [
              {
                text: "🔍 Buscar otro centro",
                callback_data: "buscar_otro_centro",
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
      this.logger.error("Error enviando información de la clínica:", error);
      await this.handleClinicError(bot, chatId);
    }
  }

  private async handleClinicError(
    bot: TelegramBot,
    chatId: number
  ): Promise<void> {
    const errorMessage = this.messageFormatter.formatErrorMessage(
      "HAZ CLICK en la imagen, LUEGO de que abras la imagen del mapa EN LA PARTE SUPERIOR DEL MAPA," +
        "UN BOTON DICE (ABRIR EN MAPS), te mostrara las Entidades solicitada más cercans a tu Ubicación ."
    );

    await bot.sendMessage(chatId, errorMessage, {
      parse_mode: "MarkdownV2",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🔄 Volver a Realizar Busqueda",
              callback_data: "buscar_clinicas",
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
  }

  // ---------------------------------------------------------------
  private async handleLocationError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Lo siento, ocurrió un error al buscar las Entidades más cercanas a tu ubicación. Por favor, intenta nuevamente.",
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

  // SOLICITO UBICACION DEL USUARIO
  async agregarComandosClinica(bot: TelegramBot): Promise<void> {
    bot.onText(/\/clinicas/, async (msg) => {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "Para Buscar Entidades cercanas, por favor comparte tu ubicación:",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "📍 Compartir ubicación",
                  request_location: true,
                },
              ],
            ],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
        }
      );
    });

    //   bot.on("location", async (msg) => {
    //     if (msg.location) {
    //       await this.mostrarCentrosCercanos(bot, msg.chat.id, msg.location);
    //     }
    //   });
  }

  async mostrarContacto(chatId: number): Promise<void> {
    try {
      const phoneNumber = "+584160897020";
      const mensaje =
        "👨‍💻 *Desarrollador*\n\n" +
        "🧑‍💻 *Nombre:* Rubén Guerrero\n" +
        "📧 *Email:* rudargeneira@gmail.com\n" +
        "📱 *Telegram:* " +
        phoneNumber;

      await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📞 Llamar por Telegram",
                url: `tg://call?number=${phoneNumber.replace("+", "")}`,
              },
            ],
            [
              {
                text: "💬 Mensaje por Telegram",
                url: `tg://msg?to=${phoneNumber.replace("+", "")}`,
              },
            ],
            [
              {
                text: "📱 Llamar al teléfono",
                url: `tel:${phoneNumber}`,
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
      this.logger.error(
        "Error al mostrar información del desarrollador:",
        error
      );
      await this.bot.sendMessage(
        chatId,
        "Lo siento, hubo un error al mostrar la información del desarrollador."
      );
    }
  }
}
