import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';

@Injectable()
export class TelegramDispatcherService {
  private readonly logger = new Logger(TelegramDispatcherService.name);

  // Mapeo de callbacks a handlers
  private callbackHandlers: Map<
    string,
    (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>
  > = new Map();

  // Mapeo de comandos a handlers
  private commandHandlers: Map<
    string,
    (msg: TelegramBot.Message) => Promise<void>
  > = new Map();

  constructor() {}

  /**
   * Registra un handler para un tipo de callback específico
   * @param pattern Patrón del callback_data (ej. 'historial_detalle_', 'nuevacita')
   * @param handler Función que maneja el callback
   */
  registerCallbackHandler(
    pattern: string,
    handler: (callbackQuery: TelegramBot.CallbackQuery) => Promise<void>,
  ) {
    this.callbackHandlers.set(pattern, handler);
    this.logger.log(`Handler de callback registrado: ${pattern}`);
  }

  /**
   * Registra un handler para un comando específico
   * @param command Patrón del comando (ej. '/start', '/help')
   * @param handler Función que maneja el comando
   */
  registerCommandHandler(
    command: string,
    handler: (msg: TelegramBot.Message) => Promise<void>,
  ) {
    this.commandHandlers.set(command, handler);
    this.logger.log(`Handler de comando registrado: ${command}`);
  }

  /**
   * Dispatcher para callbacks - enruta al handler apropiado
   */
  async dispatchCallback(
    callbackQuery: TelegramBot.CallbackQuery,
  ): Promise<boolean> {
    const data = callbackQuery.data;
    if (!data) return false;

    this.logger.debug(`Procesando callback: ${data}`);

    // Probar cada patrón registrado (order matters - first match wins)
    for (const [pattern, handler] of this.callbackHandlers.entries()) {
      if (data === pattern) {
        try {
          await handler(callbackQuery);
          return true;
        } catch (error) {
          this.logger.error(`Error en handler de callback ${pattern}:`, error);
          return false;
        }
      }
    }

    this.logger.warn(`No handler encontrado para callback: ${data}`);
    return false;
  }

  /**
   * Dispatcher para mensajes de texto - enruta al handler apropiado
   */
  async dispatchMessage(msg: TelegramBot.Message): Promise<boolean> {
    if (!msg.text) return false;

    this.logger.debug(`Procesando mensaje: ${msg.text}`);

    // Probar comandos registrados (order matters - first match wins)
    for (const [command, handler] of this.commandHandlers.entries()) {
      const regex = new RegExp(`^${escapeRegex(command)}$`);
      const match = msg.text.match(regex);
      if (match) {
        try {
          await handler(msg);
          return true;
        } catch (error) {
          this.logger.error(`Error en handler de comando ${command}:`, error);
          return false;
        }
      }
    }

    // Si no es un comando conocido, retornar false para que sea manejado por default
    this.logger.log(
      `Mensaje no reconocido (enrutado a handler por defecto): ${msg.text}`,
    );
    return false;
  }

  /**
   * Obtiene la lista de patrones de callback registrados (para debugging)
   */
  getRegisteredCallbacks(): string[] {
    return Array.from(this.callbackHandlers.keys());
  }

  /**
   * Obtiene la lista de comandos registrados (para debugging)
   */
  getRegisteredCommands(): string[] {
    return Array.from(this.commandHandlers.keys());
  }
}

/**
 * Escapa caracteres especiales para expresiones regulares
 */
function escapeRegex(pattern: string): string {
  return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
