import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as TelegramBot from "node-telegram-bot-api";
import { MedicationReminder } from "../../Entities/MedicationReminder.entity";
import { EmergencyInfo } from "src/Entities/EmergencyInfo.entity";

@Injectable()
export class EmergencyInfoService {
  private readonly logger = new Logger(EmergencyInfoService.name);
  private userEmergencyData = new Map<number, any>();

  constructor(
    @InjectRepository(MedicationReminder)
    private reminderRepository: Repository<MedicationReminder>,
    @InjectRepository(EmergencyInfo)
    private emergencyInfoRepository: Repository<EmergencyInfo>,
    @Inject("TELEGRAM_BOT") private bot: TelegramBot
  ) {}

  async mostrarMenuEmergencia(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🚨 *Información de Emergencia Médica* 🚨\n\n" +
        "Configura tu información médica crítica para que esté disponible en caso de emergencia.",
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
    // Iniciar el proceso de recopilación de información
    const message = await this.bot.sendMessage(
      chatId,
      "Por favor, ingresa tus alergias conocidas (escribe 'ninguna' si no tienes):",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    this.bot.onReplyToMessage(chatId, message.message_id, async (msg) => {
      if (!msg.text) return;

      // Guardar alergias y solicitar condiciones médicas
      this.userEmergencyData.set(chatId, { allergies: msg.text });

      const conditionsMsg = await this.bot.sendMessage(
        chatId,
        "Ahora, ingresa tus condiciones médicas importantes (escribe 'ninguna' si no tienes):",
        {
          reply_markup: {
            force_reply: true,
            selective: true,
          },
        }
      );

      this.bot.onReplyToMessage(
        chatId,
        conditionsMsg.message_id,
        async (condMsg) => {
          if (!condMsg.text) return;

          // Actualizar con condiciones médicas y solicitar contacto de emergencia
          const userData = this.userEmergencyData.get(chatId);
          userData.conditions = condMsg.text;
          this.userEmergencyData.set(chatId, userData);

          const contactMsg = await this.bot.sendMessage(
            chatId,
            "Por último, ingresa un contacto de emergencia (nombre y teléfono):",
            {
              reply_markup: {
                force_reply: true,
                selective: true,
              },
            }
          );

          this.bot.onReplyToMessage(
            chatId,
            contactMsg.message_id,
            async (contactReply) => {
              if (!contactReply.text) return;

              // Finalizar configuración
              const finalUserData = this.userEmergencyData.get(chatId);
              finalUserData.emergencyContact = contactReply.text;

              // Aquí guardaríamos en la base de datos
              await this.guardarInformacionEmergencia(chatId, finalUserData);

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
                    ],
                  },
                }
              );
            }
          );
        }
      );
    });
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
      await this.guardarCodigoAcceso(chatId, accessCode);

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
              [{ text: "🔙 Volver al menú", callback_data: "menu_emergencia" }],
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

  // Métodos auxiliares para interactuar con la base de datos
  async guardarInformacionEmergencia(
    chatId: number,
    userData: any
  ): Promise<void> {
    try {
      // Buscar si ya existe información para este usuario
      let emergencyInfo = await this.emergencyInfoRepository.findOne({
        where: { chatId: chatId.toString() },
      });

      if (!emergencyInfo) {
        // Crear nueva entrada
        emergencyInfo = new EmergencyInfo();
        emergencyInfo.chatId = chatId.toString();
      }

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

  async generarCodigoEmergencia(chatId: number): Promise<void> {
    try {
      // Generar código aleatorio de 6 dígitos
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString();

      // Guardar en la base de datos
      let emergencyInfo = await this.obtenerInformacionEmergencia(chatId);

      if (!emergencyInfo) {
        await this.bot.sendMessage(
          chatId,
          "❌ Primero debes configurar tu información de emergencia."
        );
        return;
      }

      emergencyInfo.accessCode = accessCode;
      await this.emergencyInfoRepository.save(emergencyInfo);

      await this.bot.sendMessage(
        chatId,
        `🔐 Tu nuevo código de acceso de emergencia es: *${accessCode}*\n\n` +
          "Este código permite a personal médico acceder a tu información en caso de emergencia.",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔙 Volver al menú", callback_data: "menu_emergencia" }],
            ],
          },
        }
      );
    } catch (error) {
      this.logger.error(
        `Error al generar código de emergencia: ${error.message}`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al generar el código. Por favor, intenta nuevamente."
      );
    }
  }

  private async guardarCodigoAcceso(
    chatId: number,
    code: string
  ): Promise<void> {
    // Guardar código en la base de datos
    const userData = this.userEmergencyData.get(chatId) || {};
    userData.accessCode = code;
    this.userEmergencyData.set(chatId, userData);
    // TODO: Implementar guardado real en base de datos
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

      // Aquí generaríamos una imagen con la información de emergencia
      // Por ahora, enviamos un mensaje con instrucciones
      await this.bot.sendMessage(
        chatId,
        "🆔 *TARJETA DE EMERGENCIA MÉDICA*\n\n" +
          "Para acceder a mi información médica en caso de emergencia:\n\n" +
          "1. Escanea este QR o visita: t.me/CitasMedicbot\n" +
          `2. Usa el código: *${emergencyInfo.accessCode}*\n\n` +
          "Esta tarjeta proporciona acceso a mis alergias, condiciones médicas, medicamentos actuales y contacto de emergencia.",
        {
          parse_mode: "Markdown",
        }
      );

      // Aquí se podría generar y enviar una imagen real de la tarjeta
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
