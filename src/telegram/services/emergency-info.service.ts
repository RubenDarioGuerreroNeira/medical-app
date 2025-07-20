import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as TelegramBot from "node-telegram-bot-api";
import { MedicationReminder } from "../../Entities/MedicationReminder.entity";
import { EmergencyInfo } from "../../Entities/EmergencyInfo.entity";
import { BloodType, RhFactor } from "../../Entities/EmergencyInfo.entity";
import * as QRCode from "qrcode";
import * as PDFDocument from "pdfkit";
// import PDFDocument from "pdfkit";
import { PassThrough } from "stream";
// Interfaz para el estado de configuración de emergencia
interface EmergencyConfigState {
  currentOperation: "configure_emergency_info";
  step:
    | "awaiting_allergies"
    | "awaiting_conditions"
    | "awaiting_contact"
    | "awaiting_tiene_seguro"
    | "awaiting_seguro"
    | "awaiting_blood_type"
    | "awaiting_rh_factor";
  data: {
    allergies?: string;
    conditions?: string;
    emergencyContact?: string;
    tieneSeguro?: boolean;
    seguro?: string | null; // Puede ser null si no tiene seguro
    bloodType?: BloodType;
    rhFactor?: RhFactor;
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
      "🚨 *Tu Tarjeta de Emergencia QR* 🚨\n\n" +
        "Esta función te permite crear una tarjeta digital con un *código QR*. En caso de una emergencia, el personal de primeros auxilios puede escanearlo para acceder a tu información médica vital (alergias, tipo de sangre, persona que pueda ser contactada, Inf sobre Póliza de Seguro .) y ayudarte de forma más segura y rápida.\n\n" +
        "¿Qué deseas hacer?",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                // text: "1-⚕️ Configurar información médica",
                text: "✅ Crear / Actualizar mi Tarjeta QR",
                callback_data: "configurar_emergencia",
              },
            ],

            // [
            //   {
            //     text: "2-🔐 Generar código de acceso de emergencia",
            //     callback_data: "generar_codigo_emergencia",
            //   },
            // ],

            [
              {
                text: "⬇️ Descargar  QR (PDF)",
                callback_data: "descargar_tarjeta_pdf",
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
                text: "🔙 Volver",
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

  private async requestNextStep(
    chatId: number,
    message: string
  ): Promise<void> {
    await this.bot.sendMessage(chatId, message, {
      reply_markup: {
        force_reply: true,
        selective: true,
      },
    });
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
      let nextQuestion = "";
      let nextStep: EmergencyConfigState["step"] | "done" = "done";

      switch (state.step) {
        case "awaiting_allergies":
          if (
            text.toLowerCase() !== "ninguna" &&
            text.toLowerCase() !== "Ninguna" &&
            !hasAlphanumeric.test(text)
          ) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para alergias parece contener solo símbolos o caracteres especiales. Por favor, ingresa información válida o escribe 'ninguna' ó 'Ninguna' si no tienes alergias."
            );
            await this.requestNextStep(
              chatId,
              "Por favor, ingresa tus alergias conocidas (escribe 'ninguna' ó 'Ninguna' si no tienes):"
            );
            return;
          }
          state.data.allergies = text;
          nextStep = "awaiting_conditions";
          nextQuestion =
            "Ahora, ingresa tus condiciones médicas importantes (escribe 'ninguna' ó 'Ninguna' si no tienes):";
          break;

        case "awaiting_conditions":
          if (
            text.toLowerCase() !== "ninguna" &&
            text.toLocaleLowerCase() !== "Ninguna" &&
            !hasAlphanumeric.test(text)
          ) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para condiciones médicas parece contener solo símbolos o caracteres especiales. Por favor, ingresa información válida o escribe 'ninguna' ó 'Ninguna'."
            );
            await this.requestNextStep(
              chatId,
              "Ahora, ingresa tus condiciones médicas importantes (escribe 'ninguna' ó 'Ninguna' si no tienes):"
            );
            return;
          }
          state.data.conditions = text;
          nextStep = "awaiting_tiene_seguro";
          nextQuestion =
            "¿Tienes seguro médico? (Responde 'si' 'Si' o 'no' 'No')";
          break;

        case "awaiting_tiene_seguro":
          if (
            text.toLowerCase() !== "si" &&
            text.toLowerCase() !== "Si" &&
            text.toLowerCase() !== "no" &&
            text.toLowerCase() !== "No"
          ) {
            await this.bot.sendMessage(
              chatId,
              "❌ Respuesta inválida. Por favor, responde 'si' 'Si' o 'no'."
            );
            await this.requestNextStep(
              chatId,
              "¿Tienes seguro médico? (Responde 'si' o 'no')"
            );
            return;
          }
          state.data.tieneSeguro = text.toLowerCase() === "si";
          if (state.data.tieneSeguro) {
            nextStep = "awaiting_seguro";
            nextQuestion =
              "Ingresa el nombre de tu compañía de seguros (escribe 'ninguno' si prefieres no decirlo):";
          } else {
            state.data.seguro = null; // Asegurarse de que sea null si no tiene
            nextStep = "awaiting_blood_type";
            nextQuestion =
              "¿Cuál es tu tipo de sangre? (A, B, AB, O) (escribe 'no se' si no lo conoces)";
          }
          break;

        case "awaiting_seguro":
          if (text.toLowerCase() !== "ninguno" && !hasAlphanumeric.test(text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ El nombre de la compañía de seguros parece contener solo símbolos o caracteres especiales. Por favor, ingresa un nombre válido o escribe 'ninguno'."
            );
            await this.requestNextStep(
              chatId,
              "Ingresa el nombre de tu compañía de seguros (escribe 'ninguno' si prefieres no decirlo):"
            );
            return;
          }
          state.data.seguro = text.toLowerCase() === "ninguno" ? null : text;
          nextStep = "awaiting_blood_type";
          nextQuestion =
            "¿Cuál es tu tipo de sangre? (A, B, AB, O) (escribe 'no se' si no lo conoces)";
          break;

        case "awaiting_blood_type":
          const upperCaseTextBlood = text.toUpperCase();
          if (
            upperCaseTextBlood !== "no se" &&
            !Object.values(BloodType).includes(upperCaseTextBlood as BloodType)
          ) {
            await this.bot.sendMessage(
              chatId,
              "❌ Tipo de sangre inválido. Por favor, ingresa A, B, AB, O, o 'no se'."
            );
            await this.requestNextStep(
              chatId,
              "¿Cuál es tu tipo de sangre? (A, B, AB, O) (escribe 'no se' si no lo conoces)"
            );
            return;
          }
          state.data.bloodType =
            upperCaseTextBlood === "no se"
              ? undefined
              : (upperCaseTextBlood as BloodType);
          nextStep = "awaiting_rh_factor";
          nextQuestion =
            "¿Cuál es tu factor Rh? (Positivo, Negativo) (escribe 'no se' si no lo conoces)";
          break;

        case "awaiting_rh_factor":
          const userInputRh = text.toLowerCase();
          let rhFactorToStore: RhFactor | undefined = undefined;

          if (userInputRh === "positivo") {
            rhFactorToStore = RhFactor.POSITIVE;
          } else if (userInputRh === "negativo") {
            rhFactorToStore = RhFactor.NEGATIVE;
          } else if (userInputRh === "no se") {
            rhFactorToStore = undefined;
          } else {
            // Entrada inválida
            await this.bot.sendMessage(
              chatId,
              "❌ Factor Rh inválido. Por favor, ingresa 'Positivo', 'Negativo', o 'no se'."
            );
            await this.requestNextStep(
              chatId,
              "¿Cuál es tu factor Rh? (Positivo, Negativo) (escribe 'no se' si no lo conoces)"
            );
            return; // Importante salir aquí para no continuar con una entrada inválida
          }

          state.data.rhFactor = rhFactorToStore;
          nextStep = "awaiting_contact";
          nextQuestion =
            "Por último, ingresa un contacto de emergencia (Nombre y Número de teléfono, escribe 'ninguno' si no deseas agregarlo):";
          break;

        case "awaiting_contact":
          if (text.toLowerCase() !== "ninguno" && !hasAlphanumeric.test(text)) {
            await this.bot.sendMessage(
              chatId,
              "❌ El texto para el contacto de emergencia parece contener solo símbolos o caracteres especiales. Por favor, ingresa un nombre y número válidos."
            );
            await this.requestNextStep(
              chatId,
              "Por último, ingresa un contacto de emergencia (Nombre y Número de teléfono, escribe 'ninguno' si no deseas agregarlo):"
            );
            return;
          }
          state.data.emergencyContact =
            text.toLowerCase() === "ninguno" ? undefined : text;
          nextStep = "done";
          break;
      }

      if (nextStep === "done") {
        if (state.step === "awaiting_contact") {
          // Solo guardar si el último paso fue el contacto
          await this.guardarInformacionEmergencia(chatId, state.data);
          this.userStates.delete(chatId); // Limpiar estado al finalizar
          await this.bot.sendMessage(
            chatId,
            "✅ Información de emergencia guardada correctamente.\n\n" +
              "Puedes acceder a ella en cualquier momento desde el menú de emergencia.\n\n" +
              "Siguiente paso es generar un código de acceso para que pueda ser Generado el QR que Contendra tu info de emergencia.",
            {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: "2-🔐 Generar código de acceso de emergencia",
                      callback_data: "generar_codigo_emergencia",
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
        }
      } else {
        state.step = nextStep;
        this.userStates.set(chatId, state);
        await this.requestNextStep(chatId, nextQuestion);
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
      message += `*Tiene seguro médico:* ${
        emergencyInfo.tieneSeguro ? "Sí" : "No"
      }\n`;
      if (emergencyInfo.tieneSeguro && emergencyInfo.seguro) {
        message += `*Compañía de seguros:* ${emergencyInfo.seguro}\n`;
      }
      message += `*Tipo de sangre:* ${
        emergencyInfo.bloodType || "No se conoce"
      }\n`;
      message += `*Factor Rh:* ${emergencyInfo.rhFactor || "No se conoce"}\n\n`;
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
          "Compártelo solo con personas de confianza o guárdalo en tu billetera/cartera/ o pegalo detras de tu Documentación de Identidad.\n" +
          "El Siguiente paso es Descargarlo ",
        {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "3-⬇️ Descargar  QR que contiene Inf vital (PDF)",
                  callback_data: "descargar_tarjeta_pdf",
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

      if (!emergencyInfo) {
        emergencyInfo = new EmergencyInfo();
        emergencyInfo.userId = chatId.toString();
        emergencyInfo.chatId = chatId.toString();
        emergencyInfo.createdAt = new Date();
      }

      emergencyInfo.allergies = userData.allergies;
      emergencyInfo.conditions = userData.conditions;
      emergencyInfo.emergencyContact = userData.emergencyContact;
      emergencyInfo.tieneSeguro = userData.tieneSeguro ?? false; // Default to false if undefined
      emergencyInfo.seguro = userData.seguro ?? null;
      emergencyInfo.bloodType = userData.bloodType;
      emergencyInfo.rhFactor = userData.rhFactor;

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

  //------------------------
  async generarTarjetaEmergenciaPDF(
    chatId: number
  ): Promise<PassThrough | null> {
    try {
      const emergencyInfo = await this.obtenerInformacionEmergencia(chatId);
      if (!emergencyInfo || !emergencyInfo.accessCode) return null;
      const botUsername = (await this.bot.getMe()).username;
      if (!botUsername) return null;

      const deepLinkUrl = `https://t.me/${botUsername}?start=${emergencyInfo.accessCode}`;
      const qrCodeData = await QRCode.toDataURL(deepLinkUrl);

      // Usa la clase así:
      const doc = new PDFDocument({ size: "A6", margin: 20 });
      const stream = new PassThrough();
      doc.pipe(stream);

      doc
        .fontSize(16)
        .text(`QR de Inf. Médica del Paciente`, { align: "center" });
      doc.moveDown();
      doc
        .fontSize(10)
        .text("QR Generado por el Bot de Telegram @CitasMedicBot", {
          align: "left",
        });
      doc.moveDown(2);
      const qrCodeX = (doc.page.width - 100) / 2;
      if (doc.y > doc.page.height - 150) doc.addPage();
      doc.image(qrCodeData, qrCodeX, doc.y, { width: 100 });
      doc.moveDown(10);
      doc
        .fontSize(10)
        .text(
          "Escanea este código para ver la información médica que el usuario registró.\nEs vital para primeros auxilios y se accede por el bot de Telegram.",
          { align: "center" }
        );
      doc.moveDown(15);
      doc.end();

      return stream;
    } catch (error) {
      this.logger.error(
        `Error al generar tarjeta de emergencia PDF: ${error.message}`
      );
      return null;
    }
  }

  //---
  async enviarTarjetaEmergenciaPDF(chatId: number): Promise<boolean> {
    try {
      const pdfStream = await this.generarTarjetaEmergenciaPDF(chatId);
      if (pdfStream) {
        await this.bot.sendDocument(
          chatId,
          pdfStream,
          {
            caption: "Tu tarjeta de emergencia médica en formato PDF.",
          },
          {
            filename: "QR_Mi_Info_Emergencia.pdf",
            contentType: "application/pdf",
          }
        );
        return true;
      } else {
        await this.bot.sendMessage(
          chatId,
          "❌ No se pudo generar la tarjeta de emergencia.  Asegúrate de haber configurado tu información y generado un código de acceso."
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Error al enviar tarjeta de emergencia PDF: ${error.message}`
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al enviar la tarjeta de emergencia. Por favor, intenta nuevamente."
      );
      return false;
    }
  }

  //

  async mostrarInformacionPorCodigoAcceso(
    chatId: number, // El chatId de la persona que escaneó el QR
    accessCode: string
  ): Promise<boolean> {
    try {
      const emergencyInfo = await this.emergencyInfoRepository.findOne({
        where: { accessCode: accessCode },
      });

      if (!emergencyInfo) {
        await this.bot.sendMessage(
          chatId,
          "❌ Código de acceso inválido o no se encontró información de emergencia asociada."
        );
        return false;
      }

      // Información solicitada: alergias, tipo de sangre, factor, si tiene seguro y nombre de la empresa.
      let message = "🚨 *INFORMACIÓN MÉDICA DE EMERGENCIA* 🚨\n\n";
      message += `*Alergias:* ${emergencyInfo.allergies || "Ninguna"}\n`;
      message += `*Tipo de sangre:* ${
        emergencyInfo.bloodType || "No se conoce"
      }\n`;
      message += `*Factor Rh:* ${emergencyInfo.rhFactor || "No se conoce"}\n`;
      message += `*Tiene seguro médico:* ${
        emergencyInfo.tieneSeguro ? "Sí" : "No"
      }\n`;

      if (emergencyInfo.tieneSeguro && emergencyInfo.seguro) {
        message += `*Compañía de seguros:* ${emergencyInfo.seguro}\n`;
      } else if (emergencyInfo.tieneSeguro && !emergencyInfo.seguro) {
        message += `*Compañía de seguros:* No especificada\n`;
      }

      if (emergencyInfo.emergencyContact) {
        message += `*Contacto de emergencia:* ${emergencyInfo.emergencyContact}\n`;
      } else {
        message += `*Contacto de emergencia:* No especificado\n`;
      }

      await this.bot.sendMessage(chatId, message, {
        parse_mode: "Markdown",
        reply_markup: {
          // Ofrecer volver al menú principal al que escaneó
          inline_keyboard: [
            [
              {
                text: "🏠 Volver al menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });
      return true;
    } catch (error) {
      this.logger.error(
        `Error al mostrar información por código de acceso (${accessCode}): ${error.message}`,
        error.stack
      );
      await this.bot.sendMessage(
        chatId,
        "❌ Ocurrió un error al intentar recuperar la información de emergencia. Por favor, intenta más tarde."
      );
      return false;
    }
  }
} // End
