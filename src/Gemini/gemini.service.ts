import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  Part,
} from "@google/generative-ai";

@Injectable()
export class GeminiAIService {
  private model: GenerativeModel;
  private readonly logger = new Logger(GeminiAIService.name);
  private readonly generationConfig: GenerationConfig = {
    temperature: 0.7,
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 1024,
  };

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Ahora usamos 'gemini-pro-vision' por defecto, ya que soportará texto e imágenes
    this.model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: this.generationConfig,
    });
  }

  private sanitizeMarkdown(text: string): string {
    return text
      .replace(/\_/g, "\\_")
      .replace(/\*/g, "\\*")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)")
      .replace(/\~/g, "\\~")
      .replace(/\`/g, "\\`")
      .replace(/\>/g, "\\>")
      .replace(/\#/g, "\\#")
      .replace(/\+/g, "\\+")
      .replace(/\-/g, "\\-")
      .replace(/\=/g, "\\=")
      .replace(/\|/g, "\\|")
      .replace(/\{/g, "\\{")
      .replace(/\}/g, "\\}")
      .replace(/\./g, "\\.")
      .replace(/\!/g, "\\!");
  }

  async generateMedicalResponse(prompt: string): Promise<string> {
    try {
      const medicalPrompt = `
        Como asistente médico de IA, proporciona una respuesta útil e informativa a la siguiente pregunta médica.
        Incluye información médica relevante, posibles causas y consejos generales cuando sea apropiado.
        Mantén un tono profesional y asegúrate de incluir las advertencias apropiadas.

        Pregunta del usuario: ${prompt}
      `;

      const result = await this.model.generateContent(medicalPrompt);
      const response = await result.response;
      let text = response.text();

      text = this.sanitizeMarkdown(text);

      return `${text}\n\n⚠️ *Aviso importante*: Esta información es solo para orientación general y no reemplaza el consejo médico profesional\\. Por favor, consulta a un profesional de la salud para un diagnóstico y tratamiento adecuado\\.`;
    } catch (error) {
      this.logger.error("Error generating Gemini medical response:", error);
      return "Lo siento, hubo un error al procesar tu consulta médica. Por favor, intenta nuevamente más tarde.";
    }
  }

  //   async extractTextFromImage(
  //     imageBuffer: Buffer,
  //     mimeType: string = "image/jpeg"
  //   ): Promise<string> {
  //     try {
  //       const imagePart = {
  //         inlineData: {
  //           mimeType: mimeType, // Usamos el mimeType proporcionado, por defecto 'image/jpeg'
  //           data: imageBuffer.toString("base64"),
  //         },
  //       } as Part;

  //       const result = await this.model.generateContent([
  //         "Extrae el texto de esta imagen.", // Prompt para extracción de texto
  //         imagePart,
  //       ]);

  //       const responseText = result.response.text();
  //       return responseText;
  //     } catch (error) {
  //       this.logger.error("Error al extraer texto de la imagen:", error);
  //       throw new Error("No se pudo extraer el texto de la imagen."); // Lanza un error para que el controlador lo maneje
  //     }
  //   }
  // }

  //   async extractTextFromImage(
  //     imageBuffer: Buffer,
  //     mimeType: string
  //   ): Promise<string> {
  //     try {
  //       // Usar el nuevo modelo gemini-1.5-flash en lugar de gemini-pro-vision

  //       const prompt =
  //         "Por favor, extrae y describe el texto que ves en esta imagen.";

  //       const result = await this.model.generateContent([
  //         prompt,
  //         {
  //           inlineData: {
  //             data: imageBuffer.toString("base64"),
  //             mimeType: mimeType,
  //           },
  //         },
  //       ]);

  //       const response = await result.response;
  //       const text = response.text();

  //       if (!text) {
  //         throw new Error("No se pudo extraer el texto de la imagen.");
  //       }

  //       return text;
  //     } catch (error) {
  //       this.logger.error("Error al extraer texto de la imagen:", error);
  //       throw new Error("No se pudo extraer el texto de la imagen.");
  //     }
  //   }
  // }

  async extractTextFromImage(
    imageBuffer: Buffer,
    mimeType: string
  ): Promise<string> {
    try {
      // Validar el tipo MIME
      const supportedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
      const actualMimeType = mimeType || "image/jpeg"; // Por defecto usar JPEG si no se especifica

      if (!supportedMimeTypes.includes(actualMimeType)) {
        throw new Error(
          `Tipo de imagen no soportado. Use uno de: ${supportedMimeTypes.join(
            ", "
          )}`
        );
      }

      const prompt =
        "Por favor, extrae y describe el texto que ves en esta imagen.";

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: actualMimeType, // Usar el tipo MIME validado
            data: imageBuffer.toString("base64"),
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error("No se pudo extraer el texto de la imagen.");
      }

      return text;
    } catch (error) {
      this.logger.error("Error al extraer texto de la imagen:", error);
      throw new Error("No se pudo extraer el texto de la imagen.");
    }
  }

  async interpretarResultadosLaboratorio(resultados: string): Promise<string> {
    try {
      const prompt = `
    Actúa como un asistente médico profesional. Analiza los siguientes resultados de laboratorio:

    ${resultados}

    Por favor proporciona:
    1. Una interpretación clara de cada valor, indicando si está dentro del rango normal
    2. Posibles implicaciones de valores anormales (si los hay)
    3. Recomendaciones generales basadas en estos resultados

    Importante: Incluye un descargo de responsabilidad indicando que esta interpretación no reemplaza el consejo médico profesional.
    `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let text = response.text();

      text = this.sanitizeMarkdown(text);

      return `${text}\n\n⚠️ *Aviso importante*: Esta interpretación es solo para orientación general y no reemplaza el consejo médico profesional\\. Por favor, consulta a un profesional de la salud para una interpretación completa de tus resultados\\.`;
    } catch (error) {
      this.logger.error("Error generating lab results interpretation:", error);
      return "Lo siento, hubo un error al interpretar tus resultados de laboratorio. Por favor, intenta nuevamente más tarde.";
    }
  }
}
