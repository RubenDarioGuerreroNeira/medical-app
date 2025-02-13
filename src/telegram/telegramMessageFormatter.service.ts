import { Injectable, Logger } from "@nestjs/common";
import { Clinica } from "./intrfaces/interface-clinicas";

@Injectable()
export class TelegramMessageFormatter {
  private readonly logger = new Logger(TelegramMessageFormatter.name);
  private readonly specialChars = [
    "_",
    "*",
    "[",
    "]",
    "(",
    ")",
    "~",
    "`",
    ">",
    "#",
    "+",
    "-",
    "=",
    "|",
    "{",
    "}",
    ".",
    "!",
  ];

  private escapeMarkdownV2(text: string = ""): string {
    if (!text) return "";

    return this.specialChars.reduce(
      (acc, char) => acc.replace(new RegExp("\\" + char, "g"), "\\" + char),
      text
    );
  }

  formatPhoneNumber(phone: string = ""): string {
    try {
      if (!phone) return "https://t.me";

      // Clean the phone number
      let cleanNumber = phone.replace(/\D/g, "");

      // Remove leading zeros and country code if present
      cleanNumber = cleanNumber.replace(/^0+/, "");
      cleanNumber = cleanNumber.replace(/^58/, "");

      // Add country code for Venezuelan numbers
      if (cleanNumber.match(/^(416|426|414|424|412|276)/)) {
        cleanNumber = `58${cleanNumber}`;
      }

      // Validate length
      if (cleanNumber.length < 10 || cleanNumber.length > 12) {
        this.logger.warn(`Invalid phone number length: ${cleanNumber}`);
        return "https://t.me";
      }

      // return `https://t.me/+${cleanNumber}`;
      return `https://t.me/\\+${cleanNumber}`;
    } catch (error) {
      this.logger.error("Error formatting phone number:", error);
      return "https://t.me";
    }
  }

  formatClinicMessage(clinica: Clinica): string {
    try {
      if (!clinica) {
        throw new Error("No clinic data provided");
      }

      const formatField = (text: string = "") =>
        this.escapeMarkdownV2(text || "");

      const nombre = formatField(clinica.nombre);
      const direccion = formatField(clinica.direccion);
      const ciudad = formatField(clinica.ciudad);
      const telefono = formatField(
        this.formatDisplayPhoneNumber(clinica.telefono)
      );
      const horario = formatField(clinica.horario);

      const especialidades = (clinica.especialidades || [])
        .filter((esp) => esp && esp.trim())
        .map((esp) => `• ${formatField(esp)}`)
        .join("\n");

      return `
🏥 *${nombre}*

📍 *Dirección:* ${direccion}
🏙 *Ciudad:* ${ciudad}
📞 *Teléfono:* ${telefono}
⏰ *Horario:* ${horario}
${clinica.emergencia24h ? "🚨 *Servicio de Emergencia 24h*\n" : ""}
👨‍⚕️ *Especialidades:*
${especialidades || "No hay especialidades disponibles"}
      `.trim();
    } catch (error) {
      this.logger.error("Error formatting clinic message:", error);
      return this.escapeMarkdownV2(
        "Error al formatear la información de la clínica"
      );
    }
  }

  private formatDisplayPhoneNumber(phone: string = ""): string {
    try {
      if (!phone) return "No disponible";

      let cleanNumber = phone.replace(/\D/g, "");
      cleanNumber = cleanNumber.replace(/^0+/, "");
      cleanNumber = cleanNumber.replace(/^58/, "");

      if (cleanNumber.match(/^(416|426|414|424|412|276)/)) {
        return `\\+58${cleanNumber}`;
      }
      return `\\+58${cleanNumber}`;
    } catch (error) {
      this.logger.error("Error formatting display phone number:", error);
      return "No disponible";
    }
  }

  formatErrorMessage(message: string): string {
    return this.escapeMarkdownV2(message);
  }
}
