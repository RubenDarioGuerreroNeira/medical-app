import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
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
    this.model = genAI.getGenerativeModel({
      model: "gemini-pro",
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

      // Usar directamente el texto del prompt
      const result = await this.model.generateContent(medicalPrompt);
      const response = await result.response;
      let text = response.text();

      // Sanitizar el texto para Telegram
      text = this.sanitizeMarkdown(text);

      return `${text}\n\n⚠️ *Aviso importante*: Esta información es solo para orientación general y no reemplaza el consejo médico profesional\\. Por favor, consulta a un profesional de la salud para un diagnóstico y tratamiento adecuado\\.`;
    } catch (error) {
      this.logger.error("Error generating Gemini response:", error);
      return "Lo siento, hubo un error al procesar tu consulta. Por favor, intenta nuevamente más tarde.";
    }
  }
}
