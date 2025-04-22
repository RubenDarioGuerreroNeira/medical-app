// telegram.service.ts
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { GeminiAIService } from "../Gemini/gemini.service";
import { ClinicasVenezuelaService } from "./centros-hospitalarios.service";
import { Clinica } from "./intrfaces/interface-clinicas";
import { Farmacia } from "./intrfaces/osm.interface";
import { OSMService } from "./farmacias-maps.service";
import { AppointmentCommands } from "./services/appointment.commands.service";
import {
  AppointmentNotification,
  TelegramKeyboard,
} from "./telegram.interfaces";
import { TelegramDiagnosticService } from "./telegramDiagnosticService.service";
import {
  Location,
  OSMPlace,
  OSMStatus,
  NominatimResponse,
  PharmacyResponse,
  ClinicaResponse,
} from "./intrfaces/osm.interface";
import { TelegramLocationHandler } from "./telegram-location-handler.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";
import { TelegramErrorHandler } from "./telegramErrorHandler.service";
import { ReminderService } from "./reminder.service";

import { TelegramMessageOptions } from "./intrfaces/telegram_MessageOptions";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  private readonly nominatimBaseUrl = "https://nominatim.openstreetmap.org";
  private locationRequestType: { [key: number]: "farmacia" | "clinica" } = {};

  constructor(
    private configService: ConfigService,
    @Inject("USER_STATES_MAP") private userStates: Map<number, any>, // Inyectar el Map
    // private userStates: Map<number, any> = new Map(),
    private geminiService: GeminiAIService,
    private clinicasVenezuelaService: ClinicasVenezuelaService,
    private osmService: OSMService,
    private locationHandler: TelegramLocationHandler,
    private messageFormatter: TelegramMessageFormatter,
    private errorHandler: TelegramErrorHandler,
    private diagnosticService: TelegramDiagnosticService,
    private reminderService: ReminderService,
    private appointmentCommands: AppointmentCommands,
    @Inject("TELEGRAM_BOT") private readonly telegramBot: TelegramBot
  ) {
    // const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    // this.bot = new TelegramBot(token, { polling: true });
    this.bot = telegramBot;
    this.initializeBot();
    this.agregarComandosClinica(this.bot);
    // manejador para callbacks queries
    this.bot.on("callback_query", async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });
  }

  private async initializeBot(): Promise<void> {
    try {
      // Ejecutar diagnóstico
      const diagnostic = await this.diagnosticService.diagnoseBot(this.bot);

      if (diagnostic.status === "ERROR") {
        this.logger.error("Bot diagnostic issues:", diagnostic.issues);
        this.logger.log("Attempting to fix issues...");
        await this.diagnosticService.fixCommonIssues(this.bot);
      }

      this.setupCommands();
      this.setupCallbackHandler();
      this.setupMessageHandler();
      this.setupErrorHandler();
      this.setupReminderCommands();
    } catch (error) {
      this.logger.error("Failed to initialize bot:", error);
    }
  }

  //-------------------------------------------------- CALLBACKS-----------------------------------------
  private async handleCallbackQuery(
    callbackQuery: TelegramBot.CallbackQuery
  ): Promise<void> {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    // observo que pasa
    this.logger.log(`Procesando callback:{data} para chatId:${chatId}`);

    // Extraer reminderId del callback_data si está presente
    let reminderId: number | undefined;
    if (data.startsWith("delete_reminder_")) {
      reminderId = parseInt(data.split("_")[2], 10);
    }

    try {
      // Responder al callback query para quitar el estado de "cargando" en el botón
      await this.bot.answerCallbackQuery(callbackQuery.id);

      if (data === "recordatorio_cita_medica") {
        this.logger.log("Intentando mostrar menú de citas médicas...");
        if (this.appointmentCommands) {
          this.logger.log("appointmentCommands está disponible");
          await this.appointmentCommands.mostrarMenuCitas(chatId);
        } else {
          this.logger.error("appointmentCommands no está disponible");
          await this.bot.sendMessage(
            chatId,
            "❌ Error: El servicio de citas médicas no está disponible."
          );
        }
        return;
      }

      // Resto del código para manejar otros callbacks...
      // ...
    } catch (error) {
      this.logger.error(
        `Error al procesar callback ${data}: ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, ocurrió un error al procesar tu solicitud."
      );
    }

    const actionHandlers = {
      menu_principal: () => this.mostrarMenuPrincipal(chatId),
      consulta_medica: () => this.iniciarConsultaMedica(chatId),
      solicitar_ubicacion_farmacia: () => this.solicitarUbicacionFarma(chatId),
      mostrarCentrosCercanos: () => this.solicitarUbicacion(chatId),
      contacto: () => this.mostrarContacto(chatId),
      recordatorios: () => this.mostrarMenuRecordatorios(chatId),
      create_reminder: () => this.iniciarCreacionRecordatorio(chatId),
      list_reminders: () => this.mostrarRecordatoriosUsuario(chatId),
      cancel_reminder: () => this.handleDeleteReminder(chatId, reminderId),
      confirm_days: () => this.finalizarCreacionRecordatorio(chatId),
      play_sound: () => this.playSound(chatId), // Agregar manejador para reproducir sonido

      // manejador citas medicas
      recordatorio_cita_medica: () =>
        this.appointmentCommands.mostrarMenuCitas(chatId),
      cita_medica: () => this.appointmentCommands.mostrarMenuCitas(chatId),
      // Agregar manejador para mostrar menú de citas
      nueva_cita: () => this.appointmentCommands.iniciarCreacionCita(chatId),
    };

    if (data in actionHandlers) {
      await actionHandlers[data]();
    }
  }

  //----- menu Principal
  private async mostrarMenuPrincipal(chatId: number): Promise<void> {
    try {
      // Intentamos obtener información del chat para personalizar el saludo
      const chat = await this.bot.getChat(chatId);
      const userName = chat.first_name || "Usuario";

      const welcomeMessage =
        `¡Hola ${userName}! 👋\n\n` +
        `Bienvenido a tu Asistente Médico Virtual 🏥\n\n` +
        `Te puedo ayudar con:\n` +
        `• Encontrar farmacias cercanas 💊\n` +
        `• Localizar centros médicos próximos 🏥\n` +
        `• Responder consultas médicas con IA 🤖\n` +
        `• Programar recordatorios de medicamentos ⏰\n\n` +
        `• Gestionar tus citas médicas 📅\n\n` +
        `¿En qué puedo ayudarte hoy?\n\n` +
        `Selecciona una opción del menú:`;

      await this.bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: "Markdown",
        reply_markup: this.getMainMenuKeyboard(),
      });
    } catch (error) {
      this.logger.error("Error al mostrar menú principal:", error);
      // Fallback en caso de error al obtener información del usuario
      const fallbackMessage =
        "¡Bienvenido! 👋\n\n" +
        "Soy tu Asistente Médico Virtual 🏥\n" +
        "¿En qué puedo ayudarte hoy?\n\n" +
        "Selecciona una opción del menú:";

      await this.bot.sendMessage(chatId, fallbackMessage, {
        reply_markup: this.getMainMenuKeyboard(),
      });
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
        [
          {
            text: "🙋‍♂️ Programar Recordatorio de Medicamentos",
            callback_data: "recordatorios",
          },
        ],
        [
          {
            text: "  Recordatorio de Citas Médicas",
            callback_data: "recordatorio_cita_medica",
          },
        ],
        [
          //   { text: "❌ Cancelar cita(Prueba)", callback_data: "cancelar_cita" },
          {
            text: "📞 Contacto con el Desarrollador",
            callback_data: "contacto",
          },
        ],
      ],
    };
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
  //--- busca clinicas y hospitales-----------
  private async mostrarCentrosCercanos(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location
  ): Promise<void> {
    try {
      const searchingMessage = await bot.sendMessage(
        chatId,
        "Buscando Centros de Atención Médica Cercanas a tu ubicación... 🔍"
      );

      const clinicasResponse = await this.osmService.buscarClinicaCercana(
        location.latitude,
        location.longitude
      );

      await bot.deleteMessage(chatId, searchingMessage.message_id);

      if (!clinicasResponse || clinicasResponse.length === 0) {
        await bot.sendMessage(
          chatId,
          "No se encontraron centros médicos cercanos a tu ubicación en un radio de 2km.",
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

      await bot.sendMessage(
        chatId,
        `Se encontraron ${clinicasResponse.length} centros médicos cercanos a tu ubicación.`
      );

      const clinicasToShow = clinicasResponse.slice(0, 5);

      for (const clinicaResponse of clinicasToShow) {
        // Transformar PharmacyResponse a Clinica con todas las propiedades requeridas
        const clinica: Clinica = {
          id: clinicaResponse.id || `temp-${Date.now()}`,
          nombre: clinicaResponse.name || "Centro Médico",
          direccion: clinicaResponse.address || "Dirección no disponible",
          ciudad: clinicaResponse.city || "Ciudad no especificada",
          estado: clinicaResponse.state || "Estado no especificado",
          telefono: clinicaResponse.telefono || "No disponible",
          coordenadas: {
            lat: clinicaResponse.location?.lat || location.latitude,
            lng: clinicaResponse.location?.lng || location.longitude,
          },
          horario: clinicaResponse.horario || "Horario no disponible",
          especialidades: clinicaResponse.especialidades || [
            "Medicina General",
          ],
          emergencia24h: clinicaResponse.emergencia24h || false,
        };

        await this.enviarInformacionClinica(bot, chatId, clinica);
      }

      if (clinicasResponse.length > 5) {
        await bot.sendMessage(
          chatId,
          `Hay ${
            clinicasResponse.length - 5
          } centros médicos más. ¿Deseas ver más resultados?`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Ver más centros médicos",
                    callback_data: "ver_mas_clinicas",
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
      } else {
        await bot.sendMessage(
          chatId,
          "Estos son todos los centros médicos encontrados en tu área.",
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
      this.logger.error(
        "Error al obtener información de los centros cercanos:",
        error
      );
      await this.handleLocationError(chatId);
    }
  }
  //------- BUSCA FARMACIAS CERCANAS---------------
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

      const farmaciasResponse = await this.osmService.buscarFarmaciaCercana(
        location.latitude,
        location.longitude
      );

      // Eliminar mensaje de "buscando..."
      await bot.deleteMessage(chatId, searchingMessage.message_id);

      if (!farmaciasResponse || farmaciasResponse.length === 0) {
        await bot.sendMessage(
          chatId,
          "No se encontraron farmacias cercanas a tu ubicación en un radio de 1km.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🔍 Ampliar búsqueda",
                    callback_data: "ampliar_busqueda_farmacias",
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

      // Primero enviamos un mensaje con la cantidad de farmacias encontradas
      await bot.sendMessage(
        chatId,
        `Se encontraron ${farmaciasResponse.length} farmacias cercanas a tu ubicación.`
      );

      // Enviamos información de cada farmacia (limitamos a 5 para no saturar)
      const farmaciasToShow = farmaciasResponse.slice(0, 5);

      for (const farmaciaResponse of farmaciasToShow) {
        // Transformar PharmacyResponse a Farmacia
        const farmacia: Farmacia = {
          ...farmaciaResponse,
          horario: farmaciaResponse.horario || "Horario no disponible",
          coordenadas: farmaciaResponse.location,
        };

        await this.enviarInformacionFarma(bot, chatId, farmacia);
      }

      // Si hay más farmacias, ofrecemos mostrar más
      if (farmaciasResponse.length > 5) {
        await bot.sendMessage(
          chatId,
          `Hay ${
            farmaciasResponse.length - 5
          } farmacias más. ¿Deseas ver más resultados?`,
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "Ver más farmacias",
                    callback_data: "ver_mas_farmacias",
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
      } else {
        // Si no hay más, solo mostramos el botón para volver al menú
        await bot.sendMessage(
          chatId,
          "Estas son todas las farmacias encontradas en tu área.",
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
      this.logger.error(
        "Error al obtener información de las farmacias cercanas:",
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
      // Enviar la ubicación de la farmacia
      if (farmacia.coordenadas?.lat && farmacia.coordenadas?.lng) {
        await bot.sendLocation(
          chatId,
          farmacia.coordenadas.lat,
          farmacia.coordenadas.lng
        );
      }

      // Preparar el mensaje con la información de la farmacia
      let message = `🏥 *${this.escapeMarkdown(
        farmacia.nombre || "Farmacia"
      )}*\n\n`;
      message += `📍 *Dirección:* ${this.escapeMarkdown(
        farmacia.direccion || "No disponible"
      )}\n`;
      message += `🕒 *Horario:* ${this.escapeMarkdown(
        farmacia.horario || "No disponible"
      )}\n`;
      message += `📱 *Teléfono:* ${this.escapeMarkdown(
        farmacia.telefono || "No disponible"
      )}\n`;
      message += `🚪 *Estado:* ${
        farmacia.servicio24h ? "Abierto ahora" : "Posiblemente cerrado"
      }\n`;

      // Botones para llamar (si hay teléfono) y obtener indicaciones
      const inlineKeyboard = [];

      if (farmacia.telefono) {
        inlineKeyboard.push([
          {
            text: "📞 Llamar",
            url: `tel:${farmacia.telefono.replace(/\s+/g, "")}`,
          },
        ]);
      }

      inlineKeyboard.push([
        {
          text: "🗺️ Obtener indicaciones",
          url: `https://www.google.com/maps/dir/?api=1&destination=${farmacia.coordenadas.lat},${farmacia.coordenadas.lng}`,
        },
      ]);

      // Enviar el mensaje con la información
      await bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: inlineKeyboard,
        },
      });
    } catch (error) {
      this.logger.error("Error al enviar información de farmacia:", error);
      await bot.sendMessage(
        chatId,
        "Ocurrió un error al mostrar la información de la farmacia."
      );
    }
  }

  // Método auxiliar para escapar caracteres especiales de Markdown
  private escapeMarkdown(text: string): string {
    if (!text) return "No disponible";
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }

  // manejador de callback queries
  // private setupCallbackHandler(): void {
  //   this.bot.on("callback_query", async (callbackQuery) => {
  //     const action = callbackQuery.data;
  //     const msg = callbackQuery.message;
  //     const chatId = msg.chat.id;

  //     // await this.handleCallbackAction(action, chatId);
  //     await this.bot.answerCallbackQuery(callbackQuery.id);
  //   });
  // }

  private setupCallbackHandler(): void {
    this.bot.on("callback_query", async (callbackQuery) => {
      try {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;

        // Log para depuración
        this.logger.log(`Callback recibido: ${data} de chatId: ${chatId}`);

        await this.handleCallbackQuery(callbackQuery);
      } catch (error) {
        this.logger.error(
          `Error en callback handler: ${error.message}`,
          error.stack
        );
      }
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

  private setupCommands(): void {
    try {
      this.bot.setMyCommands([
        { command: "/start", description: "Iniciar el bot" },
        { command: "/help", description: "Ver comandos disponibles" },
      ]);

      this.bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userName = msg.from?.first_name;
        this.logger.log(`Nuevo usuario: ${userName}, ChatID: ${chatId}`);

        let retries = 3;
        while (retries > 0) {
          try {
            // Usar la versión con nombre de usuario opcional
            await this.mostrarMenuPrincipal(chatId);
            break;
          } catch (error) {
            retries--;
            if (retries === 0) throw error;
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
      });
    } catch (error) {
      this.logger.error("Error setting up commands:", error);
    }
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
  }

  async mostrarContacto(chatId: number): Promise<void> {
    try {
      const phoneNumber = "584160897020"; // Removido el "+" del inicio
      const mensaje =
        "👨‍💻 *Desarrollador*\n\n" +
        "🧑‍💻 *Nombre:* Rubén Guerrero\n" +
        "📧 *Email:* rudargeneira@gmail.com\n" +
        "📱 *Telegram:* +" +
        phoneNumber;

      await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "💬 Mensaje por Telegram",
                url: `https://t.me/${phoneNumber}`,
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
        "Lo siento, hubo un error al mostrar la información del desarrollador. Por favor, intenta nuevamente.",
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
  }
  //-------------------Reminder Medical-------------------

  // Agregar estos métodos dentro de la clase TelegramService

  private setupReminderCommands(): void {
    this.bot.onText(/\/recordatorio/, (msg) => this.handleReminderCommand(msg));
    this.bot.onText(/\/misrecordatorios/, (msg) =>
      this.showUserReminders(msg.chat.id)
    );
  }

  private async handleReminderCommand(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      "🕒 Configuración de recordatorio de medicamentos\n\n" +
        "Por favor, sigue los pasos para configurar tu recordatorio:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➕ Crear nuevo recordatorio",
                callback_data: "create_reminder",
              },
            ],
            [
              {
                text: "📋 Ver mis recordatorios",
                callback_data: "list_reminders",
              },
            ],
            [{ text: "❌ Cancelar", callback_data: "cancel_reminder" }],
          ],
        },
      }
    );
  }

  private async createNewReminder(chatId: number): Promise<void> {
    const userState = {
      step: 1,
      medicationName: "",
      dosage: "",
      reminderTime: "",
      daysOfWeek: [],
    };

    // Guardamos el estado del usuario
    this.userStates.set(chatId, userState);

    await this.bot.sendMessage(
      chatId,
      "💊 Por favor, escribe el nombre del medicamento:"
    );

    // Configuramos el manejador para las respuestas
    this.setupReminderResponseHandler(chatId);
  }

  private setupReminderResponseHandler(chatId: number): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId) return;

      const userState = this.userStates.get(chatId);
      if (!userState) return;

      try {
        switch (userState.step) {
          case 1:
            userState.medicationName = msg.text;
            userState.step = 2;
            await this.bot.sendMessage(
              chatId,
              "📊 Indica la dosis del medicamento:"
            );
            break;

          case 2:
            userState.dosage = msg.text;
            userState.step = 3;
            await this.bot.sendMessage(
              chatId,
              "⏰ ¿A qué hora necesitas el recordatorio? (Formato 24h, ejemplo: 14:30)"
            );
            break;

          case 3:
            if (!this.isValidTimeFormat(msg.text)) {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de hora inválido. Por favor, usa el formato HH:mm (ejemplo: 14:30)"
              );
              return;
            }
            userState.reminderTime = msg.text;
            userState.step = 4;
            await this.showDaySelector(chatId);
            break;

          case 4:
            // Procesamiento final y creación del recordatorio
            await this.finalizeReminderCreation(chatId, userState);
            this.bot.removeListener("message", messageHandler);
            break;
        }
      } catch (error) {
        this.logger.error("Error en el manejador de recordatorios:", error);
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al procesar tu solicitud. Por favor, intenta nuevamente."
        );
        this.bot.removeListener("message", messageHandler);
      }
    };

    this.bot.on("message", messageHandler);
  }

  private async showDaySelector(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📅 Selecciona los días para el recordatorio:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Lun", callback_data: "day_1" },
              { text: "Mar", callback_data: "day_2" },
              { text: "Mié", callback_data: "day_3" },
            ],
            [
              { text: "Jue", callback_data: "day_4" },
              { text: "Vie", callback_data: "day_5" },
              { text: "Sáb", callback_data: "day_6" },
            ],
            [
              { text: "Dom", callback_data: "day_0" },
              { text: "Todos los días", callback_data: "all_days" },
            ],
            [{ text: "✅ Confirmar", callback_data: "confirm_days" }],
          ],
        },
      }
    );
  }

  private async finalizeReminderCreation(
    chatId: number,
    userState: any
  ): Promise<void> {
    try {
      const reminder = await this.reminderService.createReminder(chatId, {
        medicationName: userState.medicationName,
        dosage: userState.dosage,
        reminderTime: userState.reminderTime,
        daysOfWeek: userState.daysOfWeek.length
          ? userState.daysOfWeek
          : [0, 1, 2, 3, 4, 5, 6],
      });

      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado exitosamente:\n\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `📊 Dosis: ${reminder.dosage}\n` +
          `⏰ Hora: ${reminder.reminderTime}\n` +
          `📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}`
      );
    } catch (error) {
      this.logger.error("Error al crear el recordatorio:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Error al crear el recordatorio. Por favor, intenta nuevamente."
      );
    } finally {
      this.userStates.delete(chatId);
    }
  }

  //---
  private async showUserReminders(chatId: number): Promise<void> {
    try {
      const reminders = await this.reminderService.getUserReminders(chatId);

      if (!reminders || reminders.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📝 No tienes recordatorios configurados actualmente.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "➕ Crear nuevo recordatorio",
                    callback_data: "create_reminder",
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

      const remindersList = reminders
        .map(
          (reminder, index) => `
📌 Recordatorio ${index + 1}:
💊 Medicamento: ${reminder.medicationName}
📊 Dosis: ${reminder.dosage}
⏰ Hora: ${reminder.reminderTime}
📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}
🆔 ID: ${reminder.id}
`
        )
        .join("\n");

      await this.bot.sendMessage(
        chatId,
        `📋 Tus recordatorios:\n${remindersList}`,
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "➕ Crear nuevo recordatorio",
                  callback_data: "create_reminder",
                },
              ],
              [
                {
                  text: "❌ Eliminar recordatorio",
                  callback_data: "delete_reminder",
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
    } catch (error) {
      this.logger.error("Error al mostrar los recordatorios:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al obtener tus recordatorios. Por favor, intenta nuevamente.",
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
  }

  async handleDeleteReminder(
    chatId: number,
    reminderId: number
  ): Promise<void> {
    try {
      await this.reminderService.deleteReminder(reminderId);
      await this.bot.sendMessage(chatId, "Recordatorio eliminado exitosamente");
    } catch (error) {
      if (error instanceof NotFoundException) {
        await this.bot.sendMessage(
          chatId,
          "El recordatorio que intentas eliminar no existe"
        );
      } else {
        await this.bot.sendMessage(
          chatId,
          "Hubo un error al eliminar el recordatorio. Por favor intenta nuevamente"
        );
        this.logger.error(
          `Error al manejar eliminación de recordatorio: ${error.message}`
        );
      }
    }
  }
  //--

  private async mostrarMenuRecordatorios(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🕒 Configuración de recordatorios de medicamentos\n\n" +
        "Por favor, selecciona una opción:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➕ Crear nuevo recordatorio",
                callback_data: "create_reminder",
              },
            ],
            [
              {
                text: "📋 Ver mis recordatorios",
                callback_data: "list_reminders",
              },
            ],
            [{ text: "❌ Cancelar", callback_data: "cancel_reminder" }],
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

  private async iniciarCreacionRecordatorio(chatId: number): Promise<void> {
    this.userStates.set(chatId, {
      step: "medication_name",
      reminderData: {},
    });

    await this.bot.sendMessage(
      chatId,
      "💊 Por favor, escribe el nombre del medicamento:"
    );

    // Configurar manejador de mensajes para el proceso de creación
    this.setupReminderMessageHandler(chatId);
  }

  private setupReminderMessageHandler(chatId: number): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId) return;

      const state = this.userStates.get(chatId);
      if (!state) return;

      try {
        switch (state.step) {
          case "medication_name":
            state.reminderData.medicationName = msg.text;
            state.step = "dosage";
            await this.bot.sendMessage(
              chatId,
              "📊 Indica la dosis del medicamento:"
            );
            break;

          case "dosage":
            state.reminderData.dosage = msg.text;
            state.step = "time";
            await this.bot.sendMessage(
              chatId,
              "⏰ ¿A qué hora necesitas el recordatorio? (Formato 24h, ejemplo: 14:30)"
            );
            break;

          case "time":
            if (this.isValidTimeFormat(msg.text)) {
              state.reminderData.reminderTime = msg.text;
              await this.mostrarSelectorDias(chatId);
              state.step = "days";
            } else {
              await this.bot.sendMessage(
                chatId,
                "❌ Formato de hora inválido. Por favor, usa el formato HH:mm (ejemplo: 14:30)"
              );
            }
            break;
        }
      } catch (error) {
        this.logger.error("Error en creación de recordatorio:", error);
        await this.handleError(chatId);
        this.bot.removeListener("message", messageHandler);
      }
    };

    this.bot.on("message", messageHandler);
  }

  private async mostrarSelectorDias(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📅 Selecciona los días para el recordatorio:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "Lun", callback_data: "day_1" },
              { text: "Mar", callback_data: "day_2" },
              { text: "Mié", callback_data: "day_3" },
            ],
            [
              { text: "Jue", callback_data: "day_4" },
              { text: "Vie", callback_data: "day_5" },
              { text: "Sáb", callback_data: "day_6" },
            ],
            [
              { text: "Dom", callback_data: "day_0" },
              { text: "Todos los días", callback_data: "all_days" },
            ],
            [{ text: "✅ Confirmar", callback_data: "confirm_days" }],
          ],
        },
      }
    );
  }

  private async finalizarCreacionRecordatorio(chatId: number): Promise<void> {
    const state = this.userStates.get(chatId);
    if (!state || !state.reminderData) return;

    try {
      const reminder = await this.reminderService.createReminder(
        chatId,
        state.reminderData
      );

      await this.bot.sendMessage(
        chatId,
        `✅ Recordatorio configurado exitosamente:\n\n` +
          `💊 Medicamento: ${reminder.medicationName}\n` +
          `📊 Dosis: ${reminder.dosage}\n` +
          `⏰ Hora: ${reminder.reminderTime}\n` +
          `📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}`,
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
      this.logger.error("Error al crear recordatorio:", error);
      await this.handleError(chatId);
    } finally {
      this.userStates.delete(chatId);
    }
  }

  private async mostrarRecordatoriosUsuario(chatId: number): Promise<void> {
    try {
      const reminders = await this.reminderService.getUserReminders(chatId);

      if (!reminders || reminders.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "No tienes recordatorios configurados.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "➕ Crear recordatorio",
                    callback_data: "create_reminder",
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

      const remindersList = reminders
        .map(
          (reminder, index) =>
            `📌 Recordatorio ${index + 1}:\n` +
            `💊 Medicamento: ${reminder.medicationName}\n` +
            `📊 Dosis: ${reminder.dosage}\n` +
            `⏰ Hora: ${reminder.reminderTime}\n` +
            `📅 Días: ${this.formatDaysOfWeek(reminder.daysOfWeek)}\n`
        )
        .join("\n");

      await this.bot.sendMessage(chatId, remindersList, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "➕ Crear nuevo recordatorio",
                callback_data: "create_reminder",
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
      this.logger.error("Error al mostrar recordatorios:", error);
      await this.handleError(chatId);
    }
  }

  private formatDaysOfWeek(days: number[]): string {
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    return days.map((day) => dayNames[day]).join(", ");
  }

  private isValidTimeFormat(time: string): boolean {
    return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
  }

  private async handleError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Lo siento, ocurrió un error. Por favor, intenta nuevamente.",
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

  // Método para reproducir sonido
  private async playSound(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🔔 Reproduciendo sonido de recordatorio..."
    );
    // Aquí puedes agregar la lógica para reproducir un sonido
  }

  async sendMessageWithOptions(
    chatId: number,
    options: TelegramMessageOptions
  ): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, options.text, {
        parse_mode: options.parse_mode,
        reply_markup: options.reply_markup,
      });
      return true;
    } catch (error) {
      this.logger.error("Error sending message with options:", error);
      return false;
    }
  }

  async sendVoiceMessage(
    chatId: number,
    voiceUrl: string,
    caption?: string
  ): Promise<void> {
    try {
      await this.bot.sendVoice(chatId, voiceUrl, { caption });
    } catch (error) {
      this.logger.error(`Error al enviar mensaje de voz: ${error.message}`);
      throw error;
    }
  }
} // fin absoluto
