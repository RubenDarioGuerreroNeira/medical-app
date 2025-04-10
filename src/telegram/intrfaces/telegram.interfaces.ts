/**
 * Interfaces para el bot de Telegram
 */

// Interfaz para el teclado inline de Telegram
export interface TelegramKeyboard {
  inline_keyboard: Array<Array<TelegramInlineButton>>;
}

// Interfaz para botones inline
export interface TelegramInlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

// Interfaz para botones de respuesta
export interface TelegramReplyKeyboard {
  keyboard: Array<Array<TelegramKeyboardButton>>;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  selective?: boolean;
}

// Interfaz para botones normales
export interface TelegramKeyboardButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
}

// Interfaz para estados de usuario
export interface UserState {
  state: string;
  data?: any;
  timestamp: number;
}

// Interfaz para resultados de diagnóstico
export interface DiagnosticResult {
  status: "OK" | "WARNING" | "ERROR";
  issues?: string[];
}
