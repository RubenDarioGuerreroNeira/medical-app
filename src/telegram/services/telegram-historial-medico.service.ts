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
  ) {
    this.setupCommandHandlers();
  }

  setupCommandHandlers(): void {
    this.bot.onText(/\/historialmedico/, (msg) =>
      this.handleHistorialMedicoCommand(msg)
    );
    this.bot.onText(/\/nuevohistorial/, (msg) =>
      this.iniciarRegistroHistorialMedico(msg.chat.id)
    );
    this.bot.onText(/\/mishistoriales/, (msg) =>
      this.mostrarHistorialMedico(msg.chat.id)
    );
  }

  // private async handleHistorialMedicoCommand(
  //   msg: TelegramBot.Message
  // ): Promise<void> {
  //   const chatId = msg.chat.id;

  //   await this.bot.sendMessage(
  //     chatId,
  //     "🏥 *Gestión de Historial Médico* 🏥\n\n" +
  //       "Puedes gestionar tu historial médico con los siguientes comandos:\n\n" +
  //       "• /nuevohistorial - Registrar una nueva consulta médica\n" +
  //       "• /mishistoriales - Ver tu historial médico completo",
  //     { parse_mode: "Markdown" }
  //   );
  // }

  public async handleHistorialMedicoCommand(
    msg: TelegramBot.Message
  ): Promise<void> {
    const chatId = msg.chat.id;
    await this.bot.sendMessage(
      chatId,
      "🏥 *Gestión de Historial Médico* 🏥\n\n" +
        "Puedes gestionar tu historial médico con los siguientes comandos:\n\n" +
        "• /nuevohistorial - Registrar una nueva consulta médica\n" +
        "• /mishistoriales - Ver tu historial médico completo",
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
      "🏥 *Gestión de Historial Médico* 🏥\n\n" +
        "Puedes gestionar tu historial médico con los siguientes comandos:\n\n" +
        "• /nuevohistorial - Registrar una nueva consulta médica\n" +
        "• /mishistoriales - Ver tu historial médico completo",
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
      this.userStates.set(chatId, {
        step: "diagnostico",
        historialData: {},
      });

      await this.bot.sendMessage(
        chatId,
        "📝 *Registro de Consulta Médica* 📝\n\n" +
          "Vamos a registrar tu consulta médica paso a paso.\n" +
          "Puedes cancelar en cualquier momento enviando /cancelar.",
        { parse_mode: "Markdown" }
      );

      await this.solicitarDiagnostico(chatId);
    } catch (error) {
      this.logger.error(
        `Error al iniciar registro: ${error.message}`,
        error.stack
      );
      await this.handleError(chatId);
    }
  }

  private async solicitarDiagnostico(chatId: number): Promise<void> {
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
    this.setupMessageHandler(chatId, "diagnostico");
  }

  private async solicitarTratamiento(chatId: number): Promise<void> {
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
    this.setupMessageHandler(chatId, "tratamiento");
  }

  private async solicitarNombreMedico(chatId: number): Promise<void> {
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
    this.setupMessageHandler(chatId, "nombreMedico");
  }

  private async solicitarEspecialidadMedico(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "🔬 Por favor, ingresa la especialidad del médico:\n" +
        '(Si no deseas registrarla, escribe "ninguna")',
      {
        reply_markup: {
          force_reply: true,
          selective: true,
        },
      }
    );

    // Configurar manejador para la respuesta
    this.setupMessageHandler(chatId, "especialidadMedico");
  }

  private async solicitarCentroMedico(chatId: number): Promise<void> {
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
    this.setupMessageHandler(chatId, "centroMedico");
  }

  private async solicitarDescripcion(chatId: number): Promise<void> {
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
    this.setupMessageHandler(chatId, "descripcion");
  }

  private async solicitarCompartible(chatId: number): Promise<void> {
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
    const messageHandler = async (msg: TelegramBot.Message) => {
      if (msg.chat.id !== chatId) return;
      if (msg.text === "/cancelar") {
        this.userStates.delete(chatId);
        await this.bot.sendMessage(chatId, "❌ Registro cancelado.");
        return;
      }

      const state = this.userStates.get(chatId);
      if (!state) return;

      // Guardar la respuesta actual
      state.historialData[currentStep] =
        msg.text === "ninguno" || msg.text === "ninguna" ? null : msg.text;

      // Avanzar al siguiente paso
      try {
        switch (currentStep) {
          case "diagnostico":
            await this.solicitarTratamiento(chatId);
            break;
          case "tratamiento":
            await this.solicitarNombreMedico(chatId);
            break;
          case "nombreMedico":
            await this.solicitarEspecialidadMedico(chatId);
            break;
          case "especialidadMedico":
            await this.solicitarCentroMedico(chatId);
            break;
          case "centroMedico":
            await this.solicitarDescripcion(chatId);
            break;
          case "descripcion":
            await this.solicitarCompartible(chatId);
            break;
        }
      } catch (error) {
        this.logger.error(
          `Error en paso ${currentStep}: ${error.message}`,
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

  async mostrarHistorialMedico(
    chatId: number,
    historialId?: number
  ): Promise<void> {
    try {
      const historiales = await this.historialMedicoService.findByChatId(
        chatId.toString()
      );

      if (historiales.length === 0) {
        await this.bot.sendMessage(
          chatId,
          "📋 No tienes registros médicos guardados.\n\n" +
            "Puedes crear uno nuevo con el comando /nuevohistorial"
        );
        return;
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

      mensaje += "Para ver detalles de un registro, selecciona su número:";

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

      await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: keyboard,
        },
      });

      // Configurar manejador para la selección de historial
      this.bot.on("callback_query", async (callbackQuery) => {
        if (!callbackQuery.data?.startsWith("historial_detalle_")) return;

        const historialId = parseInt(
          callbackQuery.data.replace("historial_detalle_", "")
        );
        await this.mostrarDetalleHistorial(
          callbackQuery.message.chat.id,
          historialId
        );
        await this.bot.answerCallbackQuery(callbackQuery.id);
      });
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

      let mensaje = `📋 *Detalle de Consulta Médica*\n\n`;
      mensaje += `📅 *Fecha:* ${fechaConsulta}\n`;
      mensaje += `🔍 *Diagnóstico:* ${historial.diagnostico}\n`;

      if (historial.tratamiento) {
        mensaje += `💊 *Tratamiento:* ${historial.tratamiento}\n`;
      }

      if (historial.descripcion) {
        mensaje += `📝 *Descripción:* ${historial.descripcion}\n`;
      }

      if (historial.nombreMedico) {
        mensaje += `👨‍⚕️ *Médico:* ${historial.nombreMedico}\n`;
      }

      if (historial.especialidadMedico) {
        mensaje += `🔬 *Especialidad:* ${historial.especialidadMedico}\n`;
      }

      if (historial.centroMedico) {
        mensaje += `🏥 *Centro Médico:* ${historial.centroMedico}\n`;
      }

      mensaje += `🔒 *Compartible:* ${historial.esCompartible ? "Sí" : "No"}\n`;

      await this.bot.sendMessage(chatId, mensaje, {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🗑️ Eliminar",
                callback_data: `historial_eliminar_${historial.id}`,
              },
              { text: "🔙 Volver", callback_data: "historial_volver" },
            ],
          ],
        },
      });

      // Configurar manejador para eliminar o volver
      this.bot.once("callback_query", async (callbackQuery) => {
        if (callbackQuery.data === "historial_volver") {
          await this.mostrarHistorialMedico(chatId);
        } else if (callbackQuery.data?.startsWith("historial_eliminar_")) {
          const idEliminar = parseInt(
            callbackQuery.data.replace("historial_eliminar_", "")
          );
          await this.confirmarEliminarHistorial(chatId, idEliminar);
        }
        await this.bot.answerCallbackQuery(callbackQuery.id);
      });
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
    await this.bot.sendMessage(
      chatId,
      "⚠️ *¿Estás seguro de que deseas eliminar este registro médico?*\n\n" +
        "Esta acción no se puede deshacer.",
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "Sí, eliminar",
                callback_data: `historial_confirmar_eliminar_${historialId}`,
              },
              {
                text: "No, cancelar",
                callback_data: "historial_cancelar_eliminar",
              },
            ],
          ],
        },
      }
    );

    this.bot.once("callback_query", async (callbackQuery) => {
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
      await this.bot.answerCallbackQuery(callbackQuery.id);
    });
  }

  private async handleError(chatId: number): Promise<void> {
    await this.bot.sendMessage(
      chatId,
      "❌ Lo siento, ha ocurrido un error. Por favor, intenta nuevamente más tarde."
    );
    this.userStates.delete(chatId);
  }
}
