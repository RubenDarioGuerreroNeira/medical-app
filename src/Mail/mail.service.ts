import { Injectable } from "@nestjs/common";
import { MailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailService {
  constructor(private mailerService: MailerService) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = `http://tudominio.com/auth/verify?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Verifica tu cuenta",
        html: `
          <h3>Bienvenido! Por favor verifica tu cuenta</h3>
          <p>Para verificar tu cuenta, haz clic en el siguiente enlace:</p>
          <a href="${url}">Verificar cuenta</a>
          <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
        `,
      });
    } catch (error) {
      console.error("Error enviando email:", error);
      throw new Error("Error al enviar el correo de verificación");
    }
  }
}
