// telegram.service.ts
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as TelegramBot from "node-telegram-bot-api";
import { GeminiAIService } from "../Gemini/gemini.service";
import {
  ClinicasVenezuelaService,
  Clinica,
} from "./centros-hospitalarios.service";
import {
  AppointmentNotification,
  TelegramKeyboard,
} from "./telegram.interfaces";
import { TelegramLocationHandler } from "./telegram-location-handler.service";
import { TelegramMessageFormatter } from "./telegramMessageFormatter.service";

@Injectable()
export class TelegramService {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    private geminiService: GeminiAIService,
    private clinicasVenezuelaService: ClinicasVenezuelaService,
    private locationHandler: TelegramLocationHandler,
    private messageFormatter: TelegramMessageFormatter
  ) {
    const token = this.configService.get<string>("TELEGRAM_BOT_TOKEN");
    this.bot = new TelegramBot(token, { polling: true });
    this.initializeBot();
    this.agregarComandosClinica(this.bot);
  }

  private setupLocationHandler(chatId: number): void {
    const messageHandler = async (msg: TelegramBot.Message) => {
      try {
        if (msg.chat.id !== chatId) return;

        if (msg.location) {
          await this.bot.sendMessage(chatId, "Procesando tu ubicación...", {
            reply_markup: { remove_keyboard: true },
          });

          // Usar el método unificado mostrarCentrosCercanos
          await this.mostrarCentrosCercanos(this.bot, chatId, msg.location);

          this.bot.removeListener("message", messageHandler);
        } else if (msg.text === "❌ Cancelar") {
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
  private setupCallbackHandler(): void {
    this.bot.on("callback_query", async (callbackQuery) => {
      const action = callbackQuery.data;
      const msg = callbackQuery.message;
      const chatId = msg.chat.id;

      await this.handleCallbackAction(action, chatId);
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });
  }
  private async handleCallbackAction(
    action: string,
    chatId: number
  ): Promise<void> {
    const actionHandlers = {
      ver_citas: () => this.mostrarCitas(chatId),
      nueva_cita: () => this.iniciarNuevaCita(chatId),
      cancelar_cita: () => this.mostrarCitasParaCancelar(chatId),
      contacto: () => this.mostrarContacto(chatId),
      consulta_medica: () => this.iniciarConsultaMedica(chatId),
      menu_principal: () => this.mostrarMenuPrincipal(chatId),
      mostrarCentrosCercanos: () => this.solicitarUbicacion(chatId), // Nuevo manejador
    };

    if (action in actionHandlers) {
      await actionHandlers[action]();
    }
  }

  private async solicitarUbicacion(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Para encontrar las clínicas más cercanas, necesito tu ubicación actual. " +
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

  private initializeBot(): void {
    this.setupCommands();
    this.setupCallbackHandler();
    this.setupMessageHandler();
    this.setupErrorHandler();
  }

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

  private setupMessageHandler(): void {
    this.bot.on("message", (msg) => {
      if (msg.text && !msg.text.startsWith("/")) {
        const chatId = msg.chat.id;
        this.handleGeneralMessage(chatId);
      }
    });
  }

  private setupErrorHandler(): void {
    this.bot.on("error", (error) => {
      this.logger.error("Error en el bot de Telegram:", error);
    });
  }

  private async handleGeneralMessage(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Gracias por tu mensaje. .\n" +
        "Mientras tanto, puedes usar los botones del menú principal:",
      { reply_markup: this.getMainMenuKeyboard() }
    );
  }

  private getMainMenuKeyboard(): TelegramKeyboard {
    return {
      inline_keyboard: [
        [
          {
            text: "🏥 Buscar Clínicas Cercanas *Funcional*",
            callback_data: "mostrarCentrosCercanos",
          },
        ],
        [
          {
            text: "🩺 Preguntale a Nuestra IA *Funcional*",
            callback_data: "consulta_medica",
          },
        ],
        [
          { text: "📅 Ver mis citas(Prueba)", callback_data: "ver_citas" },
          { text: "➕ Nueva cita", callback_data: "nueva_cita" },
        ],
        [
          { text: "❌ Cancelar cita(Prueba)", callback_data: "cancelar_cita" },
          { text: "📞 Contacto", callback_data: "contacto" },
        ],
      ],
    };
  }

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

  private async mostrarCitas(chatId: number): Promise<void> {
    // Aquí implementarías la lógica para obtener las citas del usuario
    const citasEjemplo = [
      { fecha: "2024-01-20", hora: "10:00", doctor: "Dr. Smith" },
      { fecha: "2024-01-25", hora: "15:30", doctor: "Dra. Johnson" },
    ];

    if (citasEjemplo.length === 0) {
      await this.bot.sendMessage(
        chatId,
        "No tienes citas programadas actualmente.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Volver", callback_data: "menu_principal" }],
            ],
          },
        }
      );
      return;
    }

    let mensaje = "📅 Tus citas programadas: (Demo)\n\n";
    citasEjemplo.forEach((cita, index) => {
      mensaje += `${index + 1}. Fecha: ${cita.fecha}\n⏰ Hora: ${
        cita.hora
      }\n👨‍⚕️ Doctor: ${cita.doctor}\n\n`;
    });

    await this.bot.sendMessage(chatId, mensaje, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Volver", callback_data: "menu_principal" }],
        ],
      },
    });
  }

  private async iniciarNuevaCita(chatId: number): Promise<void> {
    const keyboard: TelegramKeyboard = {
      inline_keyboard: [
        [
          {
            text: "Medicina General (Prueba)",
            callback_data: "especialidad_general",
          },
          { text: "Pediatría (Demo)", callback_data: "especialidad_pediatria" },
        ],
        [
          {
            text: "Cardiología (Prueba)",
            callback_data: "especialidad_cardiologia",
          },
          {
            text: "Dermatología (Prueba)",
            callback_data: "especialidad_dermatologia",
          },
        ],
        [{ text: "🔙 Volver al menú", callback_data: "menu_principal" }],
      ],
    };

    await this.bot.sendMessage(
      chatId,
      "👨‍⚕️ Selecciona la especialidad para tu nueva cita:",
      { reply_markup: keyboard }
    );
  }

  private async seleccionarEspecialidad(
    chatId: number,
    especialidad: string
  ): Promise<void> {
    // Aquí implementarías la lógica para mostrar horarios disponibles
    await this.bot.sendMessage(
      chatId,
      `Has seleccionado ${especialidad}. Esta función estará disponible próximamente.`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Volver", callback_data: "nueva_cita" }],
          ],
        },
      }
    );
  }

  private async mostrarCitasParaCancelar(chatId: number): Promise<void> {
    // Aquí implementarías la lógica para obtener las citas del usuario
    const citasEjemplo = [
      { id: "1", fecha: "2024-01-20", hora: "10:00", doctor: "Dr. Smith" },
      { id: "2", fecha: "2024-01-25", hora: "15:30", doctor: "Dra. Johnson" },
    ];

    if (citasEjemplo.length === 0) {
      await this.bot.sendMessage(
        chatId,
        "No tienes citas que puedas cancelar.",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Volver", callback_data: "menu_principal" }],
            ],
          },
        }
      );
      return;
    }

    const keyboard: TelegramKeyboard = {
      inline_keyboard: [
        ...citasEjemplo.map((cita) => [
          {
            text: `${cita.fecha} ${cita.hora} - ${cita.doctor}`,
            callback_data: `cancelar_${cita.id}`,
          },
        ]),
        [{ text: "🔙 Volver al menú", callback_data: "menu_principal" }],
      ],
    };

    await this.bot.sendMessage(
      chatId,
      "❌ Selecciona la cita que deseas cancelar (Prueba):",
      { reply_markup: keyboard }
    );
  }

  private async confirmarCancelacion(
    chatId: number,
    citaId: string
  ): Promise<void> {
    // Aquí implementarías la lógica para cancelar la cita
    await this.bot.sendMessage(chatId, `La cita ${citaId} ha sido cancelada.`, {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔙 Volver", callback_data: "menu_principal" }],
        ],
      },
    });
  }

  private async mostrarContacto(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "📞 Información de contacto:\n\n" +
        "🏥 Centro Médico: Centro Médico XYZ\n" +
        "📍 Dirección: [Tu dirección]\n" +
        "☎️ Teléfono: +58 0416 0897020\n" +
        "📧 Email: rudargeneira@gmail.com\n" +
        "⏰ Horario: Lunes a Viernes 8:00 AM - 5:00 PM",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔙 Volver", callback_data: "menu_principal" }],
          ],
        },
      }
    );
  }

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

  // Métodos existentes para notificaciones
  async sendAppointmentNotification(
    chatId: number,
    appointment: AppointmentNotification
  ): Promise<boolean> {
    const message = `
🏥 Recordatorio de Cita Médica

📅 Fecha: ${appointment.date}
⏰ Hora: ${appointment.time}
👨‍⚕️ Doctor: ${appointment.doctorName}
🏢 Consultorio: ${appointment.location}

ℹ️ Por favor, llegue 10 minutos antes de su cita.
🎫 Presente este mensaje en recepción.

¿Necesita cancelar o reprogramar?
Use los botones del menú principal.
    `;

    return this.sendMessage(chatId, message);
  }

  async sendMessage(chatId: number, message: string): Promise<boolean> {
    try {
      await this.bot.sendMessage(chatId, message);
      return true;
    } catch (error) {
      this.logger.error("Error enviando mensaje:", error);
      return false;
    }
  }

  private async iniciarConsultaMedica(chatId: number): Promise<void> {
    const sentMessage = await this.bot.sendMessage(
      chatId,
      "Por favor, escribe tu pregunta médica:",
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
          "Por favor, escribe un texto con tu pregunta."
        );
      }
    });
  }

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
  async obtenerRespuestaMedica(pregunta: string): Promise<string> {
    const respuestaSimulada = await this.generarRespuesta(pregunta);
    return respuestaSimulada;
  }

  async generarRespuesta(pregunta: string): Promise<string> {
    const disclaimer =
      "\n\n**Importante:** Esta información es solo para fines informativos y no sustituye el consejo médico profesional. Siempre consulta a un médico para obtener un diagnóstico y tratamiento adecuados.";

    if (pregunta.toLowerCase().includes("fiebre")) {
      return (
        "La fiebre puede ser un síntoma de muchas enfermedades. Es importante medir tu temperatura y consultar a un médico si es alta o persistente. También debes buscar atención médica si tienes otros síntomas como dificultad para respirar, dolor de cabeza intenso o erupciones cutáneas." +
        disclaimer
      );
    } else if (pregunta.toLowerCase().includes("dolor de cabeza")) {
      return (
        "El dolor de cabeza puede tener muchas causas, desde estrés hasta migrañas. Descansa, hidrátate y toma un analgésico de venta libre si es necesario. Si el dolor de cabeza es intenso, persistente o está acompañado de otros síntomas como visión borrosa o fiebre, consulta a un médico." +
        disclaimer
      );
    } else {
      return (
        "Soy un modelo de lenguaje y no puedo proporcionar diagnósticos médicos. Por favor, consulta a un médico para obtener asesoramiento profesional sobre tu problema de salud." +
        disclaimer
      );
    }
  }

  private async mostrarCentrosCercanos(
    bot: TelegramBot,
    chatId: number,
    location: TelegramBot.Location
  ): Promise<void> {
    try {
      const clinica = await this.clinicasVenezuelaService.obtenerClinicaCercana(
        location.latitude,
        location.longitude
      );

      if (!clinica) {
        await bot.sendMessage(
          chatId,
          "No se encontraron centros cercanos a tu ubicación.",
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

      await this.enviarInformacionClinica(bot, chatId, clinica);
    } catch (error) {
      this.logger.error(
        "Error al obtener información de los centros cercanos:",
        error
      );
      await this.handleLocationError(chatId);
    }
  }

  private async handleLocationError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Lo siento, ocurrió un error al buscar clínicas cercanas. Por favor, intenta nuevamente.",
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

  private async enviarInformacionClinica(
    bot: TelegramBot,
    chatId: number,
    clinica: Clinica
  ): Promise<void> {
    try {
      // Enviar ubicación si hay coordenadas disponibles
      if (clinica.coordenadas) {
        await bot.sendLocation(
          chatId,
          clinica.coordenadas.lat,
          clinica.coordenadas.lng
        );
      }

      const message = await this.messageFormatter.formatClinicMessage(clinica);
      const phoneUrl = await this.messageFormatter.formatPhoneNumber(
        clinica.telefono
      );

      await bot.sendMessage(chatId, message, {
        parse_mode: "MarkdownV2",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Contactar por Telegram",
                url: phoneUrl,
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
      this.logger.error("Error sending clinic information:", error);
      const errorMessage = this.messageFormatter.formatErrorMessage(
        "Lo siento, ocurrió un error al mostrar la información. Por favor, intenta nuevamente."
      );
      await bot.sendMessage(chatId, errorMessage, {
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
      });
    }
  }

  async agregarComandosClinica(bot: TelegramBot): Promise<void> {
    bot.onText(/\/clinicas/, async (msg) => {
      const chatId = msg.chat.id;
      await bot.sendMessage(
        chatId,
        "Para encontrar clínicas cercanas, por favor comparte tu ubicación:",
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

    bot.on("location", async (msg) => {
      if (msg.location) {
        await this.mostrarCentrosCercanos(bot, msg.chat.id, msg.location);
      }
    });
  }
}
