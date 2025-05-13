import { Inject, Injectable, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { GeminiAIService } from "../../Gemini/gemini.service";

@Injectable()
export class TelegramLabResultsService {
  private readonly logger = new Logger(TelegramLabResultsService.name);
  private userStates: Map<number, any>;

  constructor(
    @Inject("TELEGRAM_BOT") private readonly bot: TelegramBot,
    private readonly geminiService: GeminiAIService,
    @Inject("USER_STATES_MAP") userStatesMap: Map<number, any>
  ) {
    this.userStates = userStatesMap;
  }

  async iniciarInterpretacionResultados(chatId: number): Promise<void> {
    const sentMessage = await this.bot.sendMessage(
      chatId,
      "📋 Por favor, envía una foto de tus resultados de laboratorio o escribe los valores que deseas interpretar:",
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
          "🔍 Analizando tus resultados, por favor espera un momento..."
        );

        await this.procesarResultadosTexto(chatId, msg.text);
        await this.bot.deleteMessage(chatId, waitingMessage.message_id);
      } else if (msg.photo) {
        await this.procesarResultadosImagen(chatId, msg);
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ Por favor, envía texto o una imagen con tus resultados de laboratorio."
        );
      }
    });
  }

  private async procesarResultadosTexto(
    chatId: number,
    texto: string
  ): Promise<void> {
    try {
      await this.bot.sendChatAction(chatId, "typing");

      const respuesta =
        await this.geminiService.interpretarResultadosLaboratorio(texto);

      if (!respuesta) {
        throw new Error("No se recibió respuesta del servicio");
      }

      const MAX_LENGTH = 4096;

      if (respuesta.length > MAX_LENGTH) {
        const chunks: string[] =
          respuesta.match(new RegExp(`.{1,${MAX_LENGTH}}`, "g")) || [];
        for (const chunk of chunks) {
          await this.enviarInterpretacion(
            chatId,
            chunk,
            chunks.indexOf(chunk) === chunks.length - 1
          );
        }
      } else {
        await this.enviarInterpretacion(chatId, respuesta, true);
      }
    } catch (error) {
      this.logger.error("Error al procesar resultados de laboratorio:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Lo siento, hubo un error al interpretar tus resultados. Por favor, intenta nuevamente."
      );
    }
  }

  private async procesarResultadosImagen(
    chatId: number,
    msg: TelegramBot.Message
  ): Promise<void> {
    try {
      const waitingMessage = await this.bot.sendMessage(
        chatId,
        "🔍 Analizando la imagen de tus resultados, esto puede tomar un momento..."
      );

      const photo = msg.photo[msg.photo.length - 1];
      const fileId = photo.file_id;
      const fileInfo = await this.bot.getFile(fileId);

      // Obtener el token de las variables de entorno en lugar de acceder directamente
      const token = process.env.TELEGRAM_BOT_TOKEN;
      const fileUrl = `https://api.telegram.org/file/bot${token}/${fileInfo.file_path}`;

      const response = await fetch(fileUrl);
      const arrayBuffer = await response.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuffer);
      const mimeType = "image/jpeg";

      const extractedText = await this.geminiService.extractTextFromImage(
        imageBuffer,
        mimeType
      );

      await this.bot.deleteMessage(chatId, waitingMessage.message_id);

      if (extractedText) {
        const interpretacionMessage = await this.bot.sendMessage(
          chatId,
          "📝 Texto extraído de la imagen, ahora interpretando los resultados..."
        );

        await this.procesarResultadosTexto(chatId, extractedText);
        await this.bot.deleteMessage(chatId, interpretacionMessage.message_id);
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ No se pudo extraer texto de la imagen. Por favor, intenta con una imagen más clara o escribe los resultados manualmente."
        );
      }
    } catch (error) {
      this.logger.error("Error al procesar imagen de resultados:", error);
      await this.bot.sendMessage(
        chatId,
        "❌ Error al procesar la imagen. Por favor, intenta nuevamente o escribe los resultados manualmente."
      );
    }
  }

  private async enviarInterpretacion(
    chatId: number,
    texto: string,
    esFinal: boolean
  ): Promise<void> {
    const options: TelegramBot.SendMessageOptions = {
      parse_mode: "MarkdownV2",
    };

    await this.bot.sendMessage(chatId, texto, options);

    if (esFinal) {
      await this.bot.sendMessage(
        chatId,
        "¿Deseas interpretar otros resultados o volver al menú principal?",
        {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📊 Nuevos resultados",
                  callback_data: "interpretar_resultados",
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
}
