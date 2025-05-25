import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as TelegramBot from "node-telegram-bot-api";
import { MedicationReminder } from "../../Entities/MedicationReminder.entity";
import { EmergencyInfo } from "../../Entities/EmergencyInfo.entity";

// Interfaz para el estado de configuración de emergencia
interface EmergencyConfigState {
  currentOperation: "configure_emergency_info";
  step: "awaiting_allergies" | "awaiting_conditions" | "awaiting_contact";
  data: {
    allergies?: string;
    conditions?: string;
    emergencyContact?: string;
  };
}

@Injectable()
export class EmergencyInfoService {
  private readonly logger = new Logger(EmergencyInfoService.name);

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @InjectRepository(EmergencyInfo)
    private emergencyInfoRepository: Repository<EmergencyInfo>,
    @Inject("TELEGRAM_BOT") private bot: TelegramBot,
    @Inject("USER_STATES_MAP")
    private userStates: Map<number, EmergencyConfigState | any>
  ) {}

  async mostrarMenuEmergencia(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🚨 *Información de Emergencia Médica* 🚨\n\n" +
        "Configura tu información médica crítica para que esté disponible para las personas que te presten primeros auxilios  EN CASO DE EMERGENCIA.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⚕️ Configurar información médica",
                callback_data: "configurar_emergencia",
              },
            ],
            [
              {
                text: "🔍 Ver mi información de emergencia",
                callback_data: "ver_emergencia",
              },
            ],
            [
              {
                text: "🔐 Generar código de acceso de emergencia",
                callback_data: "generar_codigo_emergencia",
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
  }

  async iniciarConfiguracionEmergencia(chatId: number): Promise<void> {
    this.userStates.set(chatId, {
      currentOperation: "configure_emergency_info",
      step: "awaiting_allergies",
      data: {},
    });

    await this.bot.sendMessage(
      chatId,
      "Por favor, ingresa tus alergias conocidas (escribe 'ninguna' si no tienes):",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );
  }

  public async handleConfigStep(msg: TelegramBot.Message): Promise<void> {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (!text) return; // Ignorar mensajes sin texto en este flujo
    const hasAlphanumeric = /[a-zA-Z0-9]/;
    const state = this.userStates.get(chatId) as EmergencyConfigState;

    if (!state || state.currentOperation !== "configure_emergency_info") {
      return; // No está en el flujo correcto
    }

    try {
      switch (state.step) {
        case "awaiting_allergies":
          if (text.toLowerCase() !== "ninguna" && !hasAlphanumeric.test(text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para alergias parece contener solo símbolos o caracteres especiales. Por favor, ingresa información válida o escribe 'ninguna'."
            );
            // Re-solicitar para mantener el force_reply y guiar al usuario
            await this.bot.sendMessage(
              chatId,
              "Por favor, ingresa tus alergias conocidas (escribe 'ninguna' si no tienes):",
              { reply_markup: { force_reply: true, selective: true } }
            );
            return; // No avanzar al siguiente paso
          }

          state.data.allergies = text;
          state.step = "awaiting_conditions";
          this.userStates.set(chatId, state);
          await this.bot.sendMessage(
            chatId,
            "Ahora, ingresa tus condiciones médicas importantes (escribe 'ninguna' si no tienes):",
            {
              reply_markup: { force_reply: true, selective: true },
            }
          );
          break;

        case "awaiting_conditions":
          if (text.toLowerCase() !== "ninguna" && !hasAlphanumeric.test(text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para condiciones médicas parece contener solo símbolos o caracteres especiales. Por favor, ingresa información válida o escribe 'ninguna'."
            );
            // Re-solicitar para mantener el force_reply y guiar al usuario
            await this.bot.sendMessage(
              chatId,
              "Ahora, ingresa tus condiciones médicas importantes (escribe 'ninguna' si no tienes):",
              { reply_markup: { force_reply: true, selective: true } }
            );
            return; // No avanzar al siguiente paso
          }
          state.data.conditions = text;
          state.step = "awaiting_contact";
          this.userStates.set(chatId, state);

          await this.bot.sendMessage(
            chatId,
            "Por último, ingresa un contacto de emergencia (Nombre y Número de teléfono):",
            {
              reply_markup: { force_reply: true, selective: true },
            }
          );
          break;

        case "awaiting_contact":
          if (!hasAlphanumeric.test(text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para el contacto de emergencia parece contener solo símbolos o caracteres especiales. Por favor, ingresa un nombre y número válidos."
            );
            // Re-solicitar para mantener el force_reply y guiar al usuario
            await this.bot.sendMessage(
              chatId,
              "Por último, ingresa un contacto de emergencia (Nombre y Número de teléfono):",
              { reply_markup: { force_reply: true, selective: true } }
            );
            return; // No avanzar al siguiente paso
          }
          state.data.emergencyContact = text;
          await this.guardarInformacionEmergencia(chatId, state.data);
          this.userStates.delete(chatId); // Limpiar estado al finalizar

          await this.bot.sendMessage(
            chatId,
            "✅ Información de emergencia guardada correctamente.\n\n" +
              "Puedes acceder a ella en cualquier momento desde el menú de emergencia.",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "🔙 Volver al menú de emergencia",
                      callback_data: "menu_emergencia",
                    },
                  ],
                  [
                    {
                      text: "🏠 Volver al menú principal",
                      callback_data: "menu_principal",
                    },
                  ],
                ],
              },
            }
          );
          break;
      }
    } catch (error) {
      this.logger.error(
        `Error en handleConfigStep (chatId: ${chatId}, step: ${state.step}): ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error procesando tu respuesta. Por favor, intenta configurar la información nuevamente desde el menú."
      );
      this.userStates.delete(chatId);
    }
  }

  async mostrarInformacionEmergencia(chatId: number): Promise<void> {
    try {
      // Obtener información de emergencia del usuario
      const emergencyInfo = await this.obtenerInformacionEmergencia(chatId);

      if (!emergencyInfo) {
        await this.bot.sendMessage(
          chatId,
          "❌ No tienes información de emergencia configurada. Por favor, configúrala primero.",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "⚕️ Configurar ahora",
                    callback_data: "configurar_emergencia",
                  },
                ],
                [
                  {
                    text: "🔙 Volver al menú",
                    callback_data: "menu_emergencia",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      // Obtener medicamentos actuales
      const medications = await this.obtenerMedicamentosActuales(chatId);

      // Crear mensaje con toda la información
      let message = "🚨 *TU INFORMACIÓN MÉDICA DE EMERGENCIA* 🚨\n\n";
      message += `*Alergias:* ${emergencyInfo.allergies || "Ninguna"}\n\n`;
      message += `*Condiciones médicas:* ${
        emergencyInfo.conditions || "Ninguna"
      }\n\n`;
      message += `*Contacto de emergencia:* ${
        emergencyInfo.emergencyContact || "No especificado"
      }\n\n`;

      if (medications.length > 0) {
        message += "*Medicamentos actuales:*\n";
        medications.forEach((med) => {
          message += `- ${med.medicationName} (${med.dosage})\n`;
        });
      } else {
        message += "*Medicamentos actuales:* Ninguno registrado\n";
      }

      message +=
        "\n🔐 Código de acceso: " + (emergencyInfo.accessCode || "No generado");

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔄 Actualizar información",
                callback_data: "configurar_emergencia",
              },
            ],
            [{ text: "🔙 Volver al menú", callback_data: "menu_emergencia" }],
          ],
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al mostrar información de emergencia: ${error.message}`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al recuperar tu información de emergencia. Por favor, intenta nuevamente."
      );
    }
  }

  async generarCodigoAccesoEmergencia(chatId: number): Promise<void> {
    try {
      // Generar código alfanumérico de 6 caracteres
      const accessCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();

      // Guardar el código en la base de datos
      await this._guardarCodigoAccesoDb(chatId, accessCode);

      await this.bot.sendMessage(
        chatId,
        "🔐 *Código de Acceso de Emergencia*\n\n" +
          `Tu nuevo código es: *${accessCode}*\n\n` +
          "Este código permite a personal médico acceder a tu información crítica en caso de emergencia.\n" +
          "Compártelo solo con personas de confianza o guárdalo en tu billetera/cartera.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "📱 Crear tarjeta de emergencia",
                  callback_data: "crear_tarjeta_emergencia",
                },
              ],
              [
                {
                  text: "🔙 Volver al menú de emergencia",
                  callback_data: "menu_emergencia",
                },
              ],
              [
                {
                  text: "🏠 Volver al menú principal",
                  callback_data: "menu_principal",
                },
              ],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(`Error al generar código de acceso: ${error.message}`);
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al generar el código de acceso. Por favor, intenta nuevamente."
      );
    }
  }

  // Guardar o actualizar la información de emergencia completa
  private async guardarInformacionEmergencia(
    chatId: number,
    userData: EmergencyConfigState["data"]
  ): Promise<void> {
    try {
      // Buscar si ya existe información para este usuario
      let emergencyInfo = await this.emergencyInfoRepository.findOne({
        where: { chatId: chatId.toString() },
      });

      // const now = new Date();

      if (!emergencyInfo) {
        // Crear nueva entrada
        emergencyInfo = new EmergencyInfo();
        emergencyInfo.userId = chatId.toString(); // Asumiendo que userId es lo mismo que chatId para EmergencyInfo
        emergencyInfo.chatId = chatId.toString();
        // emergencyInfo.createdAt = now; // <-- Asigna la fecha de creación
      } /*else {
        emergencyInfo.updatedAt = now; // <-- Actualiza la fecha de modificación
      }*/

      // Actualizar datos
      emergencyInfo.allergies = userData.allergies;
      emergencyInfo.conditions = userData.conditions;
      emergencyInfo.emergencyContact = userData.emergencyContact;

      // Guardar en la base de datos
      await this.emergencyInfoRepository.save(emergencyInfo);

      this.logger.log(
        `Información de emergencia guardada para chatId: ${chatId}`
      );
    } catch (error) {
      this.logger.error(
        `Error al guardar información de emergencia: ${error.message}`
      );
      throw error;
    }
  }

  async obtenerInformacionEmergencia(
    chatId: number
  ): Promise<EmergencyInfo | null> {
    try {
      return await this.emergencyInfoRepository.findOne({
        where: { chatId: chatId.toString() },
      });
    } catch (error) {
      this.logger.error(
        `Error al obtener información de emergencia: ${error.message}`
      );
      throw error;
    }
  }

  async obtenerMedicamentosActuales(
    chatId: number
  ): Promise<MedicationReminder[]> {
    try {
      // Obtener recordatorios de medicamentos activos para este usuario
      return await this.reminderRepository.find({
        where: {
          chatId: chatId.toString(),
          isActive: true,
        },
      });
    } catch (error) {
      this.logger.error(`Error al obtener medicamentos: ${error.message}`);
      return [];
    }
  }

  // Guardar/Actualizar solo el código de acceso en la BD
  private async _guardarCodigoAccesoDb(
    chatId: number,
    accessCode: string
  ): Promise<void> {
    try {
      let emergencyInfo = await this.emergencyInfoRepository.findOne({
        where: { chatId: chatId.toString() },
      });
      if (!emergencyInfo) {
        emergencyInfo = new EmergencyInfo();
        emergencyInfo.chatId = chatId.toString();
        emergencyInfo.userId = chatId.toString();
        // Podrías querer que el usuario configure otra info primero,
        // o permitir generar código incluso sin otra info.
        // Por ahora, creamos una entrada si no existe.
      }
      emergencyInfo.accessCode = accessCode;
      await this.emergencyInfoRepository.save(emergencyInfo);
      this.logger.log(`Código de acceso guardado para chatId: ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Error al guardar código de acceso en DB: ${error.message}`,
        error.stack
      );
      throw error; // Re-lanzar para que el llamador lo maneje
    }
  }

  async crearTarjetaEmergencia(chatId: number): Promise<void> {
    try {
      const emergencyInfo = await this.obtenerInformacionEmergencia(chatId);

      if (!emergencyInfo || !emergencyInfo.accessCode) {
        await this.bot.sendMessage(
          chatId,
          "❌ Necesitas configurar tu información de emergencia y generar un código de acceso primero."
        );
        return;
      }

      const botUsername = (await this.bot.getMe()).username;
      if (!botUsername) {
        this.logger.error(
          "No se pudo obtener el username del bot para la tarjeta de emergencia."
        );
        await this.bot.sendMessage(
          chatId,
          "❌ Ocurrió un error al generar la información para la tarjeta. No se pudo obtener el nombre del bot."
        );
        return;
      }

      // Aquí generaríamos una imagen con la información de emergencia
      // Por ahora, enviamos un mensaje con instrucciones
      await this.bot.sendMessage(
        chatId,
        "🆔 *TARJETA DE EMERGENCIA MÉDICA*\n\n" +
          "Para acceder a mi información médica en caso de emergencia:\n\n" +
          `1. Escanea este QR (si se proporciona) o visita: t.me/${botUsername}\n` +
          `2. Usa el código: *${emergencyInfo.accessCode}*\n\n` +
          "Esta tarjeta proporciona acceso a mis alergias, condiciones médicas, medicamentos actuales y contacto de emergencia.",
        {
          parse_mode: "Markdown",
        }
      );

      // Opcional: Enviar un QR Code
      // Podrías usar una librería como 'qrcode' para generar la URL del bot
      // const qr = require('qrcode');
      // const botUrl = `https://t.me/${botUsername}`;
      // try {
      //   const qrImage = await qr.toDataURL(botUrl);
      //   const imageBuffer = Buffer.from(qrImage.split(",")[1], 'base64');
      //   await this.bot.sendPhoto(chatId, imageBuffer, { caption: "Escanea este QR para acceder al bot." });
      // } catch (qrError) {
      //   this.logger.error(`Error generando QR para tarjeta de emergencia: ${qrError.message}`);
      //   await this.bot.sendMessage(chatId, "No se pudo generar el código QR para la tarjeta en este momento.");
      // }
    } catch (error) {
      this.logger.error(
        `Error al crear tarjeta de emergencia: ${error.message}`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al crear la tarjeta de emergencia. Por favor, intenta nuevamente."
      );
    }
  }
}
