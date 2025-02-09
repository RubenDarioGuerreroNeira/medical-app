import { Injectable } from "@nestjs/common";
import { Clinica } from "./intrfaces/interface-clinicas";

@Injectable()
export class TelegramMessageFormatter {
  private escapeMarkdownV2(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  }

  formatPhoneNumber(telefono: string): string {
    try {
      // Limpia el número de teléfono de cualquier carácter no numérico
      let cleanNumber = telefono.replace(/\D/g, "");

      // Eliminar cualquier prefijo existente
      cleanNumber = cleanNumber.replace(/^0+/, ""); // Eliminar ceros iniciales
      cleanNumber = cleanNumber.replace(/^58/, ""); // Eliminar 58 si existe

      // Si el número comienza con 416, 426, etc. (códigos de operadoras móviles)
      // o 276 (código de área), asumimos que es un número venezolano
      if (cleanNumber.match(/^(416|426|414|424|412|276)/)) {
        // Agregar el código de país de Venezuela (+58)
        cleanNumber = `58${cleanNumber}`;
      }

      // Asegurarse de que el número tenga el formato correcto para Telegram
      const formattedNumber = `+${cleanNumber}`;

      // Validar que el número tenga una longitud razonable (ejemplo: +58 + 10 dígitos)
      if (cleanNumber.length < 10 || cleanNumber.length > 12) {
        throw new Error("Número de teléfono inválido");
      }

      return `https://t.me/${formattedNumber}`;
    } catch (error) {
      console.error("Error formatting phone number:", error);
      return "https://t.me"; // URL de fallback
    }
  }

  formatClinicMessage(clinica: Clinica): string {
    const formatField = (text: string) => this.escapeMarkdownV2(text);

    const nombre = formatField(clinica.nombre);
    const direccion = formatField(clinica.direccion);
    const ciudad = formatField(clinica.ciudad);
    // Formatear el teléfono para mostrarlo con el código de país
    const telefonoFormateado = formatField(
      this.formatDisplayPhoneNumber(clinica.telefono)
    );
    const horario = formatField(clinica.horario);

    const especialidades = clinica.especialidades
      .filter((esp) => esp.trim() !== "")
      .map((esp) => `• ${formatField(esp)}`)
      .join("\n");

    return `
🏥 *${nombre}*

📍 *Dirección:* ${direccion}
🏙 *Ciudad:* ${ciudad}
📞 *Teléfono:* ${telefonoFormateado}
⏰ *Horario:* ${horario}
${clinica.emergencia24h ? "🚨 *Servicio de Emergencia 24h*\n" : ""}
👨‍⚕️ *Especialidades:*
${especialidades}
        `.trim();
  }

  // Nuevo método para formatear el número de teléfono para mostrar
  private formatDisplayPhoneNumber(telefono: string): string {
    try {
      let cleanNumber = telefono.replace(/\D/g, "");
      cleanNumber = cleanNumber.replace(/^0+/, "");
      cleanNumber = cleanNumber.replace(/^58/, "");

      if (cleanNumber.match(/^(416|426|414|424|412|276)/)) {
        return `\+58${cleanNumber}`;
      }
      return `\+58${cleanNumber}`;
    } catch (error) {
      return telefono; // Devolver el número original si hay algún error
    }
  }

  formatErrorMessage(message: string): string {
    return this.escapeMarkdownV2(message);
  }
}
