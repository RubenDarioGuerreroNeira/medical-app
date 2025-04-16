// // src/health-centers/health-centers.service.ts
// import { HttpService } from "@nestjs/axios";
// import { Injectable, HttpServer } from "@nestjs/common";
// import { AxiosResponse } from "axios";

// @Injectable()
// export class HealthCentersService {
//   private readonly baseUrl = "https://www.datos.gov.co/resource/gt2j-8ykr.json";

//   constructor(private readonly httpService: HttpService) {}

//   async getCentersByCity(city: string): Promise<any[]> {
//     const url = `${this.baseUrl}?municipio=${encodeURIComponent(
//       city.toUpperCase()
//     )}`;
//     const response: AxiosResponse = await this.httpService.axiosRef.get(url);
//     return response.data;
//   }
// }

import { HttpService } from "@nestjs/axios";
import { Injectable, Inject, Logger } from "@nestjs/common";
import { AxiosResponse } from "axios";

@Injectable()
export class HealthCentersService {
  private readonly baseUrl = "https://www.datos.gov.co/resource/gt2j-8ykr.json";
  private readonly logger = new Logger(HealthCentersService.name);

  constructor(private readonly httpService: HttpService) {
    this.logger.log("HealthCentersService inicializado");
  }

  async getCentersByCity(city: string): Promise<any[]> {
    try {
      const url = `${this.baseUrl}?municipio=${encodeURIComponent(
        city.toUpperCase()
      )}`;

      this.logger.log(`Buscando centros médicos en: ${url}`);

      const response: AxiosResponse = await this.httpService.axiosRef.get(url);

      this.logger.log(`Encontrados ${response.data.length} centros médicos`);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Error al obtener centros médicos: ${error.message}`,
        error.stack
      );
      return [];
    }
  }
}
