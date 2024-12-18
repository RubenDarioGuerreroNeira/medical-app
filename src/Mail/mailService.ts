import { Injectable } from "@nestjs/common";
import { MailerService as NestMailerService } from "@nestjs-modules/mailer";

@Injectable()
export class MailerService {
  constructor(private readonly mailerService: NestMailerService) {}

  async sendVerificationMail(email: string, name: string, token: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Verifica tu cuenta",
        template: "verification",
        context: {
          name: name,
          token: token,
        },
      });
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }

  async sendWelcomeMail(email: string, username: string) {
    try {
      await this.mailerService.sendMail({
        to: email,
        subject: "Bienvenido",
        template: "welcome",
        context: {
          username,
        },
      });
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      return false;
    }
  }
}
