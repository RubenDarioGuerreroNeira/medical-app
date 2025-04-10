import { Injectable, Inject } from "@nestjs/common";
import { TelegramBaseService } from "./telegram-base.service";
import { GeminiAIService } from "../../Gemini/gemini.service";
import * as TelegramBot from "node-telegram-bot-api";
import { ConfigService } from "@nestjs/config";
import { TelegramErrorHandler } from "../telegramErrorHandler.service";
import { TelegramDiagnosticService } from "../telegramDiagnosticService.service";

@Injectable()
export class TelegramAIService extends TelegramBaseService {
  constructor(
    private geminiService: GeminiAIService,
    configService: ConfigService,
    errorHandler: TelegramErrorHandler,
    diagnosticService: TelegramDiagnosticService,
    @Inject("TELEGRAM_BOT") bot: TelegramBot
  ) {
    super(configService, errorHandler, diagnosticService, bot);
  }

  async iniciarConsultaMedica(chatId: number): Promise<void> {
    const sentMessage = await this.bot.sendMessage(
      chatId,
      "Por favor, escribe tu pregunta médica, Toma una foto de lo que deseas saber, ó Carga una foto desde tu galería:",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, sentMessage.message_id, async (msg) => {
      if (msg.text) {
        const waitingMessage = await this.bot.sendMessage(
          chatId,
          "🤔 Estoy analizando tu consulta, por favor espera un momento..."
        );

        await this.procesarPreguntaMedica(chatId, msg.text);
        await this.bot.deleteMessage(chatId, waitingMessage.message_id);
      } else if (msg.photo) {
        await this.handleImageMessage(chatId, msg);
      }
    });
  }

  private async procesarPreguntaMedica(
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

      // Procesar imagen y enviar a Gemini
      const imageResponse = await fetch(fileLink);
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

      const extractedText = await this.geminiService.extractTextFromImage(
        imageBuffer,
        imageResponse.headers.get("content-type") || "image/jpeg"
      );

      await this.enviarResultadoAnalisisImagen(chatId, extractedText);
    } catch (error) {
      this.logger.error("Error handling image message:", error);
      await this.manejarErrorImagen(chatId);
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

  private async enviarResultadoAnalisisImagen(
    chatId: number,
    texto: string
  ): Promise<void> {
    if (texto) {
      await this.bot.sendMessage(
        chatId,
        "Texto extraído de la imagen:\n\n" + texto,
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
      await this.manejarErrorImagen(chatId);
    }
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
      "No se pudo procesar la imagen. Por favor, asegúrate de que la imagen sea clara y legible.",
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
