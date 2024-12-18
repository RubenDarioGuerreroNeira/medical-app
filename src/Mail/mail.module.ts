import { MailerModule } from "@nestjs-modules/mailer";
import { Module } from "@nestjs/common";
import { MailService } from "./mail.service";

@Module({
  imports: [
    MailerModule.forRoot({
      transport: {
        host: "smtp.sendgrid.net",
        auth: {
          user: "apikey", // Este valor siempre es 'apikey'
          pass: "492NTFYPLMVTJC3S6D2YYK2D",
        },
      },
      defaults: {
        from: '"No Reply" <noreply@tudominio.com>',
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
