import { Injectable, Inject } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import { GeminiAIService } from "../../Gemini/gemini.service";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";
import { TelegramMenuService } from "../services/telegram-menu.service";

@Injectable()
export class TelegramAIService extends TelegramBaseService {
  constructor(
    private geminiService: GeminiAIService,
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    private menuService: TelegramMenuService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

  async iniciarConsultaMedica(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Por favor, escribe tu pregunta médica, Toma una foto de lo que deseas saber, ó Carga una foto desde tu galería:",
      {
        // El reply_markup con force_reply ya no es necesario aquí,
        // ya que el manejador principal se encargará de la respuesta.
      }
    );
  }

   async procesarPreguntaMedica(
    chatId: number,
    pregunta: string
  ): Promise<void> {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      // Asegurarnos que la respuesta sea string
      const respuesta: string =
        await this.geminiService.generateMedicalResponse(pregunta);

      // Validar que tenemos una respuesta válida
      if (!respuesta) {
        throw new Error("No se recibió respuesta del servicio");
      }

      const MAX_LENGTH = 4096;

      if (respuesta.length > MAX_LENGTH) {
        const chunks: string[] =
          respuesta.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g")) || [];
        for (const chunk of chunks) {
          await this.enviarRespuestaMedica(
            chatId,
            chunk,
            chunks.indexOf(chunk) === chunks.length - 1
          );
        }
      } else {
        await this.enviarRespuestaMedica(chatId, respuesta, true);
      }
    } catch (error) {
      this.logger.error("Error processing medical question:", error);
      await this.manejarErrorConsulta(chatId);
    }
  }


  async handleImageMessage(
    chatId: number,
    msg: TelegramBot.Message
  ): Promise<void> {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      if (!msg.photo || msg.photo.length === 0) {
        await this.bot.sendMessage(chatId, "No se pudo procesar la imagen.");
        return;
      }

      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      const fileLink = await this.bot.getFileLink(fileId);

      // Descargar la imagen de los servidores de Telegram
      const imageResponse = await fetch(fileLink);

      // Validar que la respuesta sea exitosa
      if (!imageResponse.ok) {
        throw new Error(
          `Error al descargar la imagen: ${imageResponse.statusText}`
        );
      }

      // Validar el tipo MIME
      const contentType = imageResponse.headers.get("content-type");
      const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
      const mimeType =
        contentType && supportedMimeTypes.includes(contentType)
          ? contentType
          : "image/jpeg";

      // Convertir la respuesta a ArrayBuffer primero
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

      // Luego convertir a Buffer
      const imageBuffer = Buffer.from(arrayBuffer);

      // Log para debugging
      this.logger.debug(`Procesando imagen con MIME type: ${mimeType}`);
      this.logger.debug(`Tamaño de la imagen: ${imageBuffer.length} bytes`);

      // Extraer texto de la imagen usando el servicio Gemini
      const extractedText = await this.geminiService.extractTextFromImage(
        imageBuffer,
        mimeType
      );

      if (extractedText) {
        // Consultar información médica automáticamente
        const infoMedicamento =
          await this.geminiService.generateMedicalResponse(extractedText);
        await this.enviarRespuestaMedica(chatId, infoMedicamento, true);
      } else {
        await this.bot.sendMessage(
          chatId,
          "No se pudo extraer texto de la imagen."
        );
        await this.bot.sendMessage(
          chatId,
          "¿Deseas intentar con otra imagen o volver al menú principal?",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📷 Enviar otra imagen",
                    callback_data: "consulta_medica",
                  },
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


  private async enviarRespuestaMedica(
    chatId: number,
    texto: string,
    esFinal: boolean
  ): Promise<void> {
    const options: TelegramBot.SendMessageOptions = {
      parse_mode: "MarkdownV2",
      reply_markup: esFinal
        ? {
            inline_keyboard: [
              [
                {
                  text: "📝 Nueva consulta",
                  callback_data: "consulta_medica",
                },
                {
                  text: "🔙 Volver al menú principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          }
        : undefined,
    };

    await this.bot.sendMessage(chatId, texto, options);
  }

  private async manejarErrorConsulta(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente más tarde.",
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

  private async manejarErrorImagen(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "No se pudo procesar la imagen. Por favor, asegúrate de que la imagen sea clara y legible."
    );

    await this.bot.sendMessage(
      chatId,
      "¿Deseas intentar con otra imagen o volver al menú principal?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📷 Enviar otra imagen",
                callback_data: "consulta_medica",
              },
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
