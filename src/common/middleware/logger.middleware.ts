import { Injectable, NestMiddleware, Logger } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP"); // Creamos un logger con el contexto 'HTTP'

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, originalUrl } = request;
    const userAgent = request.get("user-agent") || "";

    // Se ejecuta cuando la respuesta se ha completado
    response.on("finish", () => {
      const { statusCode } = response;
      const contentLength = response.get("content-length");

      // Formato del log: [Contexto] Método URL CódigoDeEstado Longitud - UserAgent IP
      if (statusCode >= 400) {
        // Loguea errores como 'error'
        this.logger.error(
          `${method} ${originalUrl} ${statusCode} ${
            contentLength || 0
          } - ${userAgent} ${ip}`
        );
      } else {
        // Loguea éxitos como 'log'
        this.logger.log(
          `${method} ${originalUrl} ${statusCode} ${
            contentLength || 0
          } - ${userAgent} ${ip}`
        );
      }
    });

    next();
  }
}
