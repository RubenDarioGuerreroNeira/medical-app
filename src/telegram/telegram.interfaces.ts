// telegram.interface.ts
export interface AppointmentNotification {
  date: string;
  time: string;
  doctorName: string;
  location: string;
  patientName?: string; // Opcional
  speciality?: string; // Opcional
  notes?: string; // Opcional
}

export interface TelegramUser {
  chatId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  registeredAt: Date;
}

export interface TelegramMessage {
  chatId: number;
  message: string;
  type: "notification" | "reminder" | "confirmation" | "cancellation";
}

export interface AppointmentReminder {
  appointmentId: string;
  chatId: number;
  reminderDate: Date;
  sent: boolean;
}

// Para los botones interactivos (los implementaremos después)
export interface TelegramButton {
  text: string;
  callback_data: string;
}

export interface TelegramKeyboard {
  inline_keyboard: TelegramButton[][];
}
