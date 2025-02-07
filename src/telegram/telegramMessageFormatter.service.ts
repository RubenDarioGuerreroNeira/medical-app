import { Injectable } from "@nestjs/common";
import { Clinica } from "./centros-hospitalarios.service";

@Injectable()
export class TelegramMessageFormatter {
  private escapeMarkdownV2(text: string): string {
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
  }

  //   formatClinicMessage(clinica: Clinica): string {
  //     const formatField = (text: string) => this.escapeMarkdownV2(text);

  //     const nombre = formatField(clinica.nombre);
  //     const direccion = formatField(clinica.direccion);
  //     const ciudad = formatField(clinica.ciudad);
  //     const telefono = formatField(clinica.telefono);
  //     const horario = formatField(clinica.horario);

  //     const especialidades = clinica.especialidades
  //       .map((esp) => `• ${formatField(esp)}`)
  //       .join("\n");

  //     return `
  // 🏥 *${nombre}*

  // 📍 *Dirección:* ${direccion}
  // 🏙 *Ciudad:* ${ciudad}
  // 📞 *Teléfono:* ${telefono}
  // ⏰ *Horario:* ${horario}
  // ${clinica.emergencia24h ? "🚨 *Servicio de Emergencia 24h*\n" : ""}
  // 👨‍⚕️ *Especialidades:*
  // ${especialidades}
  //     `.trim();
  //   }

  // formatPhoneNumber(telefono: string): string {
  //   try {
  //     // Eliminar todos los espacios y caracteres especiales
  //     let cleanNumber = telefono.trim().replace(/[\s\-()]/g, "");

  //     // Eliminar cualquier prefijo existente
  //     cleanNumber = cleanNumber.replace(/^0+/, ""); // Eliminar ceros iniciales
  //     cleanNumber = cleanNumber.replace(/^\+58/, ""); // Eliminar +58 si existe

  //     // Si el número no comienza con 276 (código de área de San Cristóbal), agregarlo
  //     if (!cleanNumber.startsWith("276")) {
  //       cleanNumber = "276" + cleanNumber;
  //     }

  //     // Formatear el número final
  //     const formattedNumber = `+58${cleanNumber}`;

  //     // Verificar que el número tenga una longitud razonable (entre 10 y 15 dígitos)
  //     if (!/^\+\d{10,15}$/.test(formattedNumber)) {
  //       return "https://t.me/"; // URL fallback válida
  //     }

  //     // Usar el formato tg:// que es más confiable para Telegram
  //     return `tg://resolve?phone=${formattedNumber.substring(1)}`; // Eliminar el + inicial
  //   } catch (error) {
  //     console.error("Error formatting phone number:", error);
  //     return "https://t.me/"; // URL fallback válida
  //   }
  // }
  // formatPhoneNumber(telefono: string): string {
  //   try {
  //     // Eliminar todos los espacios y caracteres especiales
  //     let cleanNumber = telefono.trim().replace(/[\s\-()]/g, "");

  //     // Eliminar cualquier prefijo existente
  //     cleanNumber = cleanNumber.replace(/^0+/, ""); // Eliminar ceros iniciales
  //     cleanNumber = cleanNumber.replace(/^\+58/, ""); // Eliminar +58 si existe

  //     // Si el número no comienza con 276 (código de área de San Cristóbal), agregarlo
  //     if (!cleanNumber.startsWith("276")) {
  //       cleanNumber = "276" + cleanNumber;
  //     }

  //     // Formatear el número para el enlace de Telegram
  //     return `https://t.me/+58${cleanNumber}`;
  //   } catch (error) {
  //     console.error("Error formatting phone number:", error);
  //     return "https://t.me"; // URL de fallback válida
  //   }
  // }

  formatPhoneNumber(telefono: string): string {
    try {
      // Eliminar todos los espacios y caracteres especiales
      let cleanNumber = telefono.trim().replace(/[\s\-()]/g, "");

      // Eliminar cualquier prefijo existente
      cleanNumber = cleanNumber.replace(/^0+/, ""); // Eliminar ceros iniciales
      cleanNumber = cleanNumber.replace(/^\+58/, ""); // Eliminar +58 si existe

      // Si el número no comienza con 276 (código de área de San Cristóbal), agregarlo
      if (!cleanNumber.startsWith("276")) {
        cleanNumber = "276" + cleanNumber;
      }

      // Formatear el número para el enlace de Telegram
      return `https://t.me/+58${cleanNumber}`;
    } catch (error) {
      console.error("Error formatting phone number:", error);
      return "https://t.me"; // URL de fallback válida
    }
  }

  formatClinicMessage(clinica: Clinica): string {
    const formatField = (text: string) => this.escapeMarkdownV2(text);

    const nombre = formatField(clinica.nombre);
    const direccion = formatField(clinica.direccion);
    const ciudad = formatField(clinica.ciudad);
    const telefono = formatField(clinica.telefono);
    const horario = formatField(clinica.horario);

    const especialidades = clinica.especialidades
      .filter((esp) => esp.trim() !== "") // Filtrar especialidades vacías
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
${especialidades}
    `.trim();
  }

  formatErrorMessage(message: string): string {
    return this.escapeMarkdownV2(message);
  }
}
