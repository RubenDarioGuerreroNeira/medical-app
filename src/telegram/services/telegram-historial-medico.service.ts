import { Injectable, Inject, Logger } from "@nestjs/common";
import * as TelegramBot from "node-telegram-bot-api";
import { TelegramHistorialMedicoService as HistorialMedicoDataService } from "../../telegram-historial-medico/telegram-historial-medico.service";
import { CreateTelegramHistorialMedicoDto } from "../../telegram-historial-medico/dto/create-telegram-historial-medico.dto";

@Injectable()
export class TelegramHistorialMedicoService {
  create(historialData: CreateTelegramHistorialMedicoDto) {
    throw new Error("Method not implemented.");
  }
  private readonly logger = new Logger(TelegramHistorialMedicoService.name);

  constructor(
    @Inject("TELEGRAM_BOT")
    private readonly bot: TelegramBot,
    @Inject("USER_STATES_MAP")
    private readonly userStates: Map<number, any>,
    private readonly historialMedicoService: HistorialMedicoDataService
  ) {}

  public async handleHistorialMedicoCommand(
    msg: TelegramBot.Message
  ): Promise<void> {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      "🏥 *TU HISTORIAL MÉDICO PERSONAL* 🏥\n\n" +
        "Mantén un registro completo de tus consultas médicas, diagnósticos y tratamientos en un solo lugar.\n\n" +
        "📋 *Beneficios:*\n" +
        "• Acceso rápido a tu historial médico en cualquier momento\n" +
        "• Seguimiento de diagnósticos y tratamientos\n" +
        "• Registro organizado de tus médicos y especialistas\n" +
        "• Información médica importante siempre disponible\n\n" +
        "¿Qué deseas hacer hoy?",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 Nuevo Historial",
                callback_data: "nuevo_historial",
              },
            ],
            [
              {
                text: "📋 Ver Mis Historiales",
                callback_data: "ver_historiales",
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

  // Método público que acepta directamente un chatId
  public async handleHistorialMedicoCommandByChatId(
    chatId: number
  ): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🏥 *TU HISTORIAL MÉDICO PERSONAL* 🏥\n\n" +
        "Mantén un registro completo de tus consultas médicas, diagnósticos y tratamientos en un solo lugar.\n\n" +
        "📋 *Beneficios:*\n" +
        "• Acceso rápido a tu historial médico en cualquier momento\n" +
        "• Seguimiento de diagnósticos y tratamientos\n" +
        "• Registro organizado de tus médicos y especialistas\n" +
        "• Información médica importante siempre disponible\n\n" +
        "¿Qué deseas hacer hoy?",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📝 Nuevo Historial",
                callback_data: "nuevo_historial",
              },
            ],
            [
              {
                text: "📋 Ver Mis Historiales",
                callback_data: "ver_historiales",
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

  async iniciarRegistroHistorialMedico(chatId: number): Promise<void> {
    try {
      this.logger.log(`[${chatId}] Iniciando registro de historial médico`);
      this.userStates.set(chatId, {
        currentOperation: "create_historial_medico",
        step: "awaiting_diagnostico",
        historialData: {},
      });

      await this.bot.sendMessage(
        chatId,
        "📝 *Registro de Historial Médico* 📝\n\n" +
          "Vamos a registrar tu historial médico paso a paso.\n" +
          "Puedes cancelar en cualquier momento enviando /cancelar.",
        { parse_mode: "Markdown" }
      );

      await this.solicitarDiagnostico(chatId);
    } catch (error) {
      this.logger.error(
        `[${chatId}] Error al iniciar registro: ${error.message}`,
        error.stack
      );
      await this.handleError(chatId);
    }
  }

  private async solicitarDiagnostico(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar diagnóstico médico`);

    await this.bot.sendMessage(
      chatId,
      "🔍 Por favor, ingresa el diagnóstico médico:",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_diagnostico");
  }

  private async solicitarTratamiento(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar tratamiento médico`);
    await this.bot.sendMessage(
      chatId,
      "💊 Por favor, ingresa el tratamiento prescrito:\n" +
        '(Si no hay tratamiento, escribe "ninguno")',
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_tratamiento");
  }

  private async solicitarNombreMedico(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar nombre del médico que preescribio`);
    await this.bot.sendMessage(
      chatId,
      "👨‍⚕️ Por favor, ingresa el nombre del médico:\n" +
        '(Si no deseas registrarlo, escribe "ninguno")',
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_nombreMedico");
  }

  private async solicitarEspecialidadMedico(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar especialidad médica`);
    await this.bot.sendMessage(
      chatId,
      "🔬 Por favor, ingresa la especialidad del médico:\n" +
        "si deseas cancelar el registro escribe /cancelar\n" +
        '(Si no deseas registrarla, escribe "ninguna")',
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_especialidadMedico");
  }

  private async solicitarCentroMedico(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar centro médico donde fue atentido`);
    await this.bot.sendMessage(
      chatId,
      "🏥 Por favor, ingresa el nombre del centro médico:\n" +
        '(Si no deseas registrarlo, escribe "ninguno")',
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_centroMedico");
  }

  private async solicitarDescripcion(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar descripción médica`);
    await this.bot.sendMessage(
      chatId,
      "📋 Por favor, proporciona una descripción de la consulta médica:\n" +
        "(Puedes incluir síntomas, observaciones, etc.)",
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "awaiting_descripcion");
  }

  private async solicitarCompartible(chatId: number): Promise<void> {
    this.logger.log(`[${chatId}] Solicitar opción de compartible`);
    await this.bot.sendMessage(
      chatId,
      "🔒 ¿Deseas que este registro sea compartible con otros médicos?",
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Sí, compartir",
                callback_data: "historial_compartible_si",
              },
              {
                text: "No, privado",
                callback_data: "historial_compartible_no",
              },
            ],
          ],
        },
      }
    );

    // Configurar manejador para la respuesta de botones
    this.bot.once("callback_query", async (callbackQuery) => {
      if (!callbackQuery.message || callbackQuery.message.chat.id !== chatId)
        return;

      const esCompartible = callbackQuery.data === "historial_compartible_si";

      await this.bot.answerCallbackQuery(callbackQuery.id);
      await this.bot.sendMessage(
        chatId,
        esCompartible
          ? "✅ Has elegido hacer este registro compartible."
          : "🔒 Has elegido mantener este registro como privado."
      );

      const state = this.userStates.get(chatId);
      if (state) {
        state.historialData.esCompartible = esCompartible;
        await this.guardarHistorialMedico(chatId);
      }
    });
  }

  private setupMessageHandler(chatId: number, currentStep: string): void {
    this.logger.log(`[${chatId}] Configurando Message Handler `);
    const messageHandler = async (msg: TelegramBot.Message) => {
      this.logger.log(`[${chatId}] Message Handler ejecutando`);

      if (msg.chat.id !== chatId) return;
      if (msg.text === "/cancelar") {
        this.logger.log(`[${chatId}] Registro Cancelado`);
        this.userStates.delete(chatId);
        await this.bot.sendMessage(
          chatId,
          "❌ Registro cancelado.",

          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "🏥 Historial Médico",
                    callback_data: "ver_historiales",
                  },
                ],
                [
                  {
                    text: "🔙 Menú Principal",
                    callback_data: "menu_principal",
                  },
                ],
              ],
            },
          }
        );
        return;
      }

      const state = this.userStates.get(chatId);
      if (!state || state.step !== currentStep) {
        this.logger.warn(`[${chatId}] Estado no válido o paso incorrecto`);
        return;
      }

      // Guardar la respuesta actual
      state.historialData[currentStep.replace("awaiting_", "")] =
        msg.text === "ninguno" || msg.text === "ninguna" ? null : msg.text;

      // Avanzar al siguiente paso
      let nextStepFunction: (() => Promise<void>) | null = null;
      let nextStepName: string | null = null;

      try {
        switch (currentStep) {
          // case "diagnostico":

          case "awaiting_diagnostico":
            nextStepFunction = () => this.solicitarTratamiento(chatId);
            nextStepName = "awaiting_tratamiento";
            break;
          case "awaiting_tratamiento":
            nextStepFunction = () => this.solicitarNombreMedico(chatId);
            nextStepName = "awaiting_nombreMedico";
            break;
          case "awaiting_nombreMedico":
            nextStepFunction = () => this.solicitarEspecialidadMedico(chatId);
            nextStepName = "awaiting_especialidadMedico";
            break;
          case "awaiting_especialidadMedico":
            nextStepFunction = () => this.solicitarCentroMedico(chatId);
            nextStepName = "awaiting_centroMedico";
            break;
          case "awaiting_centroMedico":
            nextStepFunction = () => this.solicitarDescripcion(chatId);
            nextStepName = "awaiting_descripcion";
            break;
          case "awaiting_descripcion":
            nextStepFunction = () => this.solicitarCompartible(chatId);
            // No hay nextStepName porque solicitarCompartible maneja el final con callbacks
            break;
        }
        if (nextStepFunction) {
          state.step = nextStepName; // Actualizar el estado al siguiente paso ANTES de llamar a la función
          this.userStates.set(chatId, state); // Guardar el estado actualizado
          await nextStepFunction();
        } else if (currentStep === "awaiting_descripcion") {
          // solicitarCompartible fue llamado, no actualizamos el step aquí,
          // se maneja dentro de solicitarCompartible o al guardar.
        } else {
          this.logger.error(
            `[${chatId}] Paso desconocido o sin continuación: ${currentStep}`
          );
          await this.handleError(chatId);
        }
      } catch (error) {
        this.logger.error(
          `[${chatId}] Error en el paso ${currentStep}: ${error.message}`,
          error.stack
        );
        await this.handleError(chatId);
      }
    };

    // Registrar el manejador una vez
    this.bot.once("message", messageHandler);
  }

  private async guardarHistorialMedico(chatId: number): Promise<void> {
    try {
      const state = this.userStates.get(chatId);
      if (!state) return;

      const historialData: CreateTelegramHistorialMedicoDto = {
        userId: chatId.toString(),
        chatId: chatId.toString(),
        diagnostico: state.historialData.diagnostico,
        tratamiento: state.historialData.tratamiento,
        descripcion: state.historialData.descripcion,
        nombreMedico: state.historialData.nombreMedico,
        especialidadMedico: state.historialData.especialidadMedico,
        centroMedico: state.historialData.centroMedico,
        esCompartible: state.historialData.esCompartible || false,
        fechaConsulta: new Date(),
      };

      const historial = await this.historialMedicoService.create(historialData);

      await this.bot.sendMessage(
        chatId,
        "✅ *Historial médico registrado con éxito*\n\n" +
          `🔍 *Diagnóstico:* ${historial.diagnostico}\n` +
          (historial.tratamiento
            ? `💊 *Tratamiento:* ${historial.tratamiento}\n`
            : "") +
          (historial.nombreMedico
            ? `👨‍⚕️ *Médico:* ${historial.nombreMedico}\n`
            : "") +
          (historial.especialidadMedico
            ? `🔬 *Especialidad:* ${historial.especialidadMedico}\n`
            : "") +
          (historial.centroMedico
            ? `🏥 *Centro Médico:* ${historial.centroMedico}\n`
            : "") +
          `🔒 *Compartible:* ${historial.esCompartible ? "Sí" : "No"}\n\n` +
          "Puedes consultar tu historial completo con el comando /mishistoriales",
        { parse_mode: "Markdown" }
      );
    } catch (error) {
      this.logger.error(
        `Error al guardar historial: ${error.message}`,
        error.stack
      );
      await this.handleError(chatId);
    } finally {
      this.userStates.delete(chatId);
    }
  }

  private async handleError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "❌ Lo siento, ha ocurrido un error. Por favor, intenta nuevamente más tarde."
    );
    this.userStates.delete(chatId);
  }

  async mostrarHistorialMedico(
    chatId: number,
    historialId?: number
  ): Promise<void> {
    try {
      // Primero, verificamos si hay un manejador de callback activo y lo eliminamos
      // para evitar duplicaciones
      const state = this.userStates.get(chatId) || {};
      if (state.activeCallbackHandler) {
        this.bot.removeListener("callback_query", state.activeCallbackHandler);
        state.activeCallbackHandler = null;
      }

      const historiales = await this.historialMedicoService.findByChatId(
        chatId.toString()
      );

      if (historiales.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📋 No tienes registros médicos guardados.\n\n" +
            "Puedes crear uno nuevo con el comando /nuevohistorial",
          {
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "📝 Crear nuevo registro",
                    callback_data: "nuevo_historial",
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
        return;
      }

      // Eliminar mensaje anterior si existe
      if (state.lastHistorialListMessageId) {
        try {
          await this.bot.deleteMessage(
            chatId,
            state.lastHistorialListMessageId.toString()
          );
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar el mensaje anterior: ${error.message}`
          );
        }
      }

      // Mostrar resumen de historiales
      let mensaje = "📋 *Tu Historial Médico*\n\n";

      historiales.forEach((historial, index) => {
        const fecha = new Date(historial.fechaConsulta).toLocaleDateString();

        mensaje += `*${index + 1}. ${historial.diagnostico}* (${fecha})\n`;
        if (historial.nombreMedico) {
          mensaje += `   👨‍⚕️ Dr. ${historial.nombreMedico}\n`;
        }
        if (historial.centroMedico) {
          mensaje += `   🏥 ${historial.centroMedico}\n`;
        }
        mensaje += "\n";
      });

      mensaje +=
        "Para ver detalles de un registro o eliminarlo,\nselecciona su número:";

      // Crear teclado inline con opciones numeradas
      const keyboard = [];
      const rowSize = 5; // Botones por fila

      for (let i = 0; i < historiales.length; i += rowSize) {
        const row = [];
        for (let j = i; j < i + rowSize && j < historiales.length; j++) {
          row.push({
            text: `${j + 1}`,
            callback_data: `historial_detalle_${historiales[j].id}`,
          });
        }
        keyboard.push(row);
      }

      // Añadir botón para volver
      keyboard.push([
        {
          text: "🔙 Volver al menú principal",
          callback_data: "menu_principal",
        },
      ]);

      const sentMessage = await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      // Guardar el ID del mensaje para poder eliminarlo después
      this.userStates.set(chatId, {
        ...state,
        lastHistorialListMessageId: sentMessage.message_id,
      });

      // Configurar manejador para la selección de historial
      const callbackHandler = async (callbackQuery) => {
        // Verificar que el callback es para este chat
        if (callbackQuery.message.chat.id !== chatId) return;

        // Verificar que es un callback de detalle de historial
        if (!callbackQuery.data?.startsWith("historial_detalle_")) return;

        await this.bot.answerCallbackQuery(callbackQuery.id);

        const historialId = parseInt(
          callbackQuery.data.replace("historial_detalle_", "")
        );

        // Eliminar el mensaje de lista para mantener limpio el chat
        try {
          const currentState = this.userStates.get(chatId);
          if (currentState?.lastHistorialListMessageId) {
            await this.bot.deleteMessage(
              chatId,
              currentState.lastHistorialListMessageId.toString()
            );
            currentState.lastHistorialListMessageId = null;
          }
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar el mensaje anterior: ${error.message}`
          );
        }

        await this.mostrarDetalleHistorial(chatId, historialId);
      };

      // Guardar referencia al manejador para poder eliminarlo después
      const updatedState = this.userStates.get(chatId) || {};
      updatedState.activeCallbackHandler = callbackHandler;
      this.userStates.set(chatId, updatedState);

      // Usar once para que solo se ejecute una vez
      this.bot.once("callback_query", callbackHandler);
    } catch (error) {
      this.logger.error(
        `Error al mostrar historial: ${error.message}`,
        error.stack
      );
      await this.handleError(chatId);
    }
  }

  public async mostrarDetalleHistorial(
    chatId: number,
    historialId: number
  ): Promise<void> {
    try {
      const historial = await this.historialMedicoService.findOne(historialId);

      const fechaConsulta = new Date(
        historial.fechaConsulta
      ).toLocaleDateString();

      let mensaje = `📋 *Detalle de CRegistro Historial Médico*\n\n`;
      mensaje += `📅 *Fecha:* ${fechaConsulta}\n`;
      mensaje += `🔍 *Diagnóstico:* ${historial.diagnostico}\n`;

      if (historial.tratamiento && historial.tratamiento !== "ninguno") {
        mensaje += `💊 *Tratamiento:* ${historial.tratamiento}\n`;
      }

      if (historial.descripcion) {
        mensaje += `📝 *Descripción:* ${historial.descripcion}\n`;
      }

      if (historial.nombreMedico && historial.nombreMedico !== "ninguno") {
        mensaje += `👨‍⚕️ *Médico:* ${historial.nombreMedico}\n`;
      }

      if (
        historial.especialidadMedico &&
        historial.especialidadMedico !== "ninguna"
      ) {
        mensaje += `🔬 *Especialidad:* ${historial.especialidadMedico}\n`;
      }

      if (historial.centroMedico && historial.centroMedico !== "ninguno") {
        mensaje += `🏥 *Centro Médico:* ${historial.centroMedico}\n`;
      }

      mensaje += `🔒 *Compartible:* ${historial.esCompartible ? "Sí" : "No"}\n`;

      const sentMessage = await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🗑️ Eliminar",
                callback_data: `historial_eliminar_${historial.id}`,
              },
              {
                text: "🔙 Volver a la lista",
                callback_data: "historial_volver",
              },
            ],
            [
              {
                text: "🏠 Menú principal",
                callback_data: "menu_principal",
              },
            ],
          ],
        },
      });

      // Guardar el ID del mensaje para poder eliminarlo después
      this.userStates.set(chatId, {
        ...this.userStates.get(chatId),
        lastHistorialDetailMessageId: sentMessage.message_id,
      });

      // Configurar manejador para eliminar o volver
      // IMPORTANTE: Usar once en lugar de on para evitar múltiples manejadores
      const callbackHandler = async (callbackQuery) => {
        // Verificar que el callback es para este chat
        if (callbackQuery.message.chat.id !== chatId) return;

        // Eliminar este manejador para evitar duplicados
        this.bot.removeListener("callback_query", callbackHandler);

        await this.bot.answerCallbackQuery(callbackQuery.id);

        // Eliminar el mensaje de detalle para mantener limpio el chat
        try {
          const state = this.userStates.get(chatId);
          if (state?.lastHistorialDetailMessageId) {
            await this.bot.deleteMessage(
              chatId,
              state.lastHistorialDetailMessageId.toString()
            );
          }
        } catch (error) {
          this.logger.warn(
            `No se pudo eliminar el mensaje anterior: ${error.message}`
          );
        }

        if (callbackQuery.data === "historial_volver") {
          await this.mostrarHistorialMedico(chatId);
        } else if (callbackQuery.data?.startsWith("historial_eliminar_")) {
          const idEliminar = parseInt(
            callbackQuery.data.replace("historial_eliminar_", "")
          );
          await this.confirmarEliminarHistorial(chatId, idEliminar);
        } else if (callbackQuery.data === "menu_principal") {
          // Manejar el regreso al menú principal
          // Aquí deberías llamar al método correspondiente
        }
      };

      this.bot.once("callback_query", callbackHandler);
    } catch (error) {
      this.logger.error(
        `Error al mostrar detalle: ${error.message}`,
        error.stack
      );
      await this.handleError(chatId);
    }
  }

  private async confirmarEliminarHistorial(
    chatId: number,
    historialId: number
  ): Promise<void> {
    const sentMessage = await this.bot.sendMessage(
      chatId,
      "⚠️ *¿Estás seguro de que deseas eliminar este registro médico?*\n\n" +
        "Esta acción no se puede deshacer.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "✅ Sí, eliminar",
                callback_data: `historial_confirmar_eliminar_${historialId}`,
              },
              {
                text: "❌ No, cancelar",
                callback_data: "historial_cancelar_eliminar",
              },
            ],
          ],
        },
      }
    );

    // Guardar el ID del mensaje para poder eliminarlo después
    this.userStates.set(chatId, {
      ...this.userStates.get(chatId),
      lastConfirmDeleteMessageId: sentMessage.message_id,
    });

    // IMPORTANTE: Usar once en lugar de on para evitar múltiples manejadores
    const callbackHandler = async (callbackQuery) => {
      // Verificar que el callback es para este chat
      if (callbackQuery.message.chat.id !== chatId) return;

      // Eliminar este manejador para evitar duplicados
      this.bot.removeListener("callback_query", callbackHandler);

      await this.bot.answerCallbackQuery(callbackQuery.id);

      // Eliminar el mensaje de confirmación para mantener limpio el chat
      try {
        const state = this.userStates.get(chatId);
        if (state?.lastConfirmDeleteMessageId) {
          await this.bot.deleteMessage(
            chatId,
            state.lastConfirmDeleteMessageId.toString()
          );
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo eliminar el mensaje anterior: ${error.message}`
        );
      }

      if (callbackQuery.data?.startsWith("historial_confirmar_eliminar_")) {
        const idEliminar = parseInt(
          callbackQuery.data.replace("historial_confirmar_eliminar_", "")
        );
        try {
          await this.historialMedicoService.remove(idEliminar);
          await this.bot.sendMessage(
            chatId,
            "✅ Registro eliminado correctamente."
          );
          await this.mostrarHistorialMedico(chatId);
        } catch (error) {
          this.logger.error(`Error al eliminar: ${error.message}`, error.stack);
          await this.handleError(chatId);
        }
      } else if (callbackQuery.data === "historial_cancelar_eliminar") {
        await this.mostrarHistorialMedico(chatId);
      }
    };

    this.bot.once("callback_query", callbackHandler);
  }
}
