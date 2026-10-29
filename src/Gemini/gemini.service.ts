import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  GenerationConfig,
  
} from '@google/generative-ai';

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
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Ahora usamos 'gemini-pro-vision' por defecto, ya que soportarÃ¡ texto e imÃ¡genes
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: this.generationConfig,
    });
  }

  async generateMedicalResponse(prompt: string): Promise<string> {
    try {
      const medicalPrompt = `
        Como asistente mÃ©dico de IA, proporciona una respuesta Ãºtil e informativa a la siguiente pregunta mÃ©dica.
        Incluye informaciÃ³n mÃ©dica relevante, posibles causas y consejos generales cuando sea apropiado.
        MantÃ©n un tono profesional y asegÃºrate de incluir las advertencias apropiadas.

        Pregunta del usuario: ${prompt}
      `;

      const result = await this.model.generateContent(medicalPrompt);
      const response = await result.response;
      const text = response.text();

      return `${text}
âš ï¸ Aviso importante: Esta informaciÃ³n es solo para orientaciÃ³n general y no reemplaza el consejo mÃ©dico profesional. Por favor, consulta a un profesional de la salud para un diagnÃ³stico y tratamiento adecuado.`;
    } catch (error) {
      this.logger.error('Error generating Gemini medical response:', error);
      return 'Lo siento, hubo un error al procesar tu consulta mÃ©dica. Por favor, intenta nuevamente mÃ¡s tarde.';
    }
  }

  async extractTextFromImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    try {
      // Validar el tipo MIME
      const supportedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
      const actualMimeType = mimeType || 'image/jpeg'; // Por defecto usar JPEG si no se especifica

      if (!supportedMimeTypes.includes(actualMimeType)) {
        throw new Error(
          `Tipo de imagen no soportado. Use uno de: ${supportedMimeTypes.join(
            ', ',
          )}`,
        );
      }

      const prompt =
        'Por favor, extrae y describe el texto que ves en esta imagen.';

      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: actualMimeType, // Usar el tipo MIME validado
            data: imageBuffer.toString('base64'),
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      if (!text) {
        throw new Error('No se pudo extraer el texto de la imagen.');
      }

      return text;
    } catch (error) {
      this.logger.error('Error al extraer texto de la imagen:', error);
      throw new Error('No se pudo extraer el texto de la imagen.');
    }
  }

  async interpretarResultadosLaboratorio(resultados: string): Promise<string> {
    try {
      const prompt = `
    ActÃºa como un asistente mÃ©dico profesional. Analiza los siguientes resultados de laboratorio:

    ${resultados}

    Por favor proporciona:
    1. Una interpretaciÃ³n clara de cada valor, indicando si estÃ¡ dentro del rango normal
    2. Posibles implicaciones de valores anormales (si los hay)
    3. Recomendaciones generales basadas en estos resultados

    Importante: Incluye un descargo de responsabilidad indicando que esta interpretaciÃ³n no reemplaza el consejo mÃ©dico profesional.
    `;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return `${text}
âš ï¸ Aviso importante: Esta interpretaciÃ³n es solo para orientaciÃ³n general y no reemplaza el consejo mÃ©dico profesional. Por favor, consulta a un profesional de la salud para una interpretaciÃ³n completa de tus resultados.`;
    } catch (error) {
      this.logger.error('Error generating lab results interpretation:', error);
      return 'Lo siento, hubo un error al interpretar tus resultados de laboratorio. Por favor, intenta nuevamente mÃ¡s tarde.';
    }
  }
}
