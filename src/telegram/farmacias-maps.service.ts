import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import fetch, { Response } from "node-fetch";
import {
  Location,
  PharmacyResponse,
  NominatimResponse,
  OSMPlace,
} from "./intrfaces/osm.interface";

// Enum para manejar estados de respuesta de Nominatim
export enum OSMStatus {
  OK = "OK",
  ZERO_RESULTS = "ZERO_RESULTS",
  REQUEST_DENIED = "REQUEST_DENIED",
  INVALID_REQUEST = "INVALID_REQUEST",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

@Injectable()
export class OSMService {
  private readonly logger = new Logger(OSMService.name);
  private readonly nominatimBaseUrl = "https://nominatim.openstreetmap.org";

  constructor() {}

  async buscarFarmaciasEnTachira(): Promise<Location[] | null> {
    try {
      const query = "farmacias en Táchira, Venezuela";
      const url = `${this.nominatimBaseUrl}/search`;
      const params = new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        country: "Venezuela",
        limit: "10", // Limitar resultados
      });

      const response = await this.fetchWithRetry(`${url}?${params}`);
      const data = await this.validateResponse<OSMPlace[]>(response);

      if (!data.length) {
        throw new HttpException(
          "No se encontraron farmacias en Táchira",
          HttpStatus.NOT_FOUND
        );
      }

      return data.map((place) => ({
        lat: parseFloat(place.lat),
        lng: parseFloat(place.lon),
      }));
    } catch (error) {
      this.handleError("buscarFarmaciasEnTachira", error);
      return null;
    }
  }

  async buscarFarmaciaCercana(
    latitude: number,
    longitude: number
  ): Promise<PharmacyResponse | null> {
    try {
      this.validateCoordinates(latitude, longitude);
      const url = `${this.nominatimBaseUrl}/reverse`;
      const params = new URLSearchParams({
        lat: latitude.toString(),
        lon: longitude.toString(),
        format: "json",
        addressdetails: "1",
        zoom: "18", // Nivel de detalle
      });

      const response = await this.fetchWithRetry(`${url}?${params}`);
      const data = await this.validateResponse<NominatimResponse>(response);

      if (!data || !data.address) {
        throw new HttpException(
          "No se encontraron farmacias cercanas",
          HttpStatus.NOT_FOUND
        );
      }

      return {
        name: data.display_name,
        location: {
          lat: parseFloat(data.lat),
          lng: parseFloat(data.lon),
        },
        address: data.address.road || "Dirección no disponible",
        isOpen: false,
        rating: null,
      };
    } catch (error) {
      this.handleError("buscarFarmaciaCercana", error);
      return null;
    }
  }

  private validateCoordinates(lat: number, lng: number): void {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new Error("Coordenadas geográficas inválidas");
    }
  }

  private async fetchWithRetry(url: string): Promise<Response> {
    let lastError: Error;
    const maxRetries = 3;
    const timeout = 5000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "NestJS-OSMService/1.0",
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) return response;
        lastError = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
      } catch (error) {
        lastError = error as Error;
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }

    throw lastError;
  }

  // Hacemos el método genérico para manejar diferentes tipos de respuesta
  private async validateResponse<T>(response: Response): Promise<T> {
    const data = (await response.json()) as T;

    if (!data) {
      throw new Error(
        `Error en la respuesta de OpenStreetMap: ${JSON.stringify(data)}`
      );
    }

    const status = this.determineStatus(data);
    if (status !== OSMStatus.OK) {
      switch (status) {
        case OSMStatus.ZERO_RESULTS:
          throw new HttpException(
            "No se encontraron resultados",
            HttpStatus.NOT_FOUND
          );
        case OSMStatus.REQUEST_DENIED:
          throw new HttpException(
            "Solicitud denegada por OpenStreetMap",
            HttpStatus.FORBIDDEN
          );
        default:
          throw new Error(`OpenStreetMap API Error: ${status}`);
      }
    }

    return data;
  }

  private determineStatus(data: any): OSMStatus {
    if (!data || (Array.isArray(data) && data.length === 0)) {
      return OSMStatus.ZERO_RESULTS;
    }
    if (data.error) {
      return OSMStatus.REQUEST_DENIED;
    }
    return OSMStatus.OK;
  }

  private handleError(method: string, error: any): void {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(`Error en ${method}: ${error.message}`, error.stack);
    throw new HttpException(
      "Error al procesar la solicitud de OpenStreetMap",
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }
}

// import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
// import { ConfigService } from "@nestjs/config";
// import fetch, { Response } from "node-fetch";
// import { retry } from "rxjs/operators";

// import {
//   GoogleMapsConfig,
//   Location,
//   PharmacyResponse,
//   GoogleMapsApiResponse,
//   GoogleMapsResult,
// } from "./intrfaces/google-maps.interface";

// export enum GoogleMapsStatus {
//   OK = "OK",
//   ZERO_RESULTS = "ZERO_RESULTS",
//   OVER_QUERY_LIMIT = "OVER_QUERY_LIMIT",
//   REQUEST_DENIED = "REQUEST_DENIED",
//   INVALID_REQUEST = "INVALID_REQUEST",
//   UNKNOWN_ERROR = "UNKNOWN_ERROR",
// }

// @Injectable()
// export class GoogleMapsService {
//   private readonly config: GoogleMapsConfig;
//   private readonly logger = new Logger(GoogleMapsService.name);

//   constructor(private configService: ConfigService) {
//     this.config = {
//       apiKey: this.configService.get<string>("GOOGLE_MAPS_API_KEY"),
//       maxRetries:
//         this.configService.get<number>("GOOGLE_MAPS_MAX_RETRIES") || 3,
//       timeout: this.configService.get<number>("GOOGLE_MAPS_TIMEOUT") || 5000,
//       radius:
//         this.configService.get<number>("GOOGLE_MAPS_SEARCH_RADIUS") || 5000,
//     };

//     this.validateConfig();
//   }

//   private validateConfig(): void {
//     if (!this.config.apiKey) {
//       throw new Error("GOOGLE_MAPS_API_KEY no está configurado en .env");
//     }

//     if (this.config.radius > 50000) {
//       this.logger.warn(
//         "Radio de búsqueda mayor a 50km puede causar resultados inexactos"
//       );
//     }
//   }

//   async buscarFarmaciasEnTachira(): Promise<Location[] | null> {
//     try {
//       const query = "farmacias en Táchira, Venezuela";
//       const url = new URL(
//         "https://maps.googleapis.com/maps/api/place/textsearch/json"
//       );

//       url.searchParams.append("query", query);
//       url.searchParams.append("key", this.config.apiKey);
//       url.searchParams.append("language", "es");

//       const response = await this.fetchWithRetry(url.toString());
//       const data = await this.validateResponse(response);

//       if (!data.results?.length) {
//         throw new HttpException(
//           "No se encontraron farmacias en Táchira",
//           HttpStatus.NOT_FOUND
//         );
//       }

//       return data.results.map((place) => ({
//         lat: place.geometry.location.lat,
//         lng: place.geometry.location.lng,
//       }));
//     } catch (error) {
//       this.handleError("buscarFarmaciasEnTachira", error);
//       return null;
//     }
//   }

//   async buscarFarmaciaCercana(
//     latitude: number,
//     longitude: number
//   ): Promise<PharmacyResponse | null> {
//     try {
//       this.validateCoordinates(latitude, longitude);

//       const url = new URL(
//         "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
//       );

//       url.searchParams.append("location", `${latitude},${longitude}`);
//       url.searchParams.append("radius", this.config.radius.toString());
//       url.searchParams.append("type", "pharmacy");
//       url.searchParams.append("key", this.config.apiKey);
//       url.searchParams.append("language", "es");

//       const response = await this.fetchWithRetry(url.toString());
//       const data = await this.validateResponse(response);

//       if (!data.results?.length) {
//         throw new HttpException(
//           "No se encontraron farmacias cercanas",
//           HttpStatus.NOT_FOUND
//         );
//       }

//       const farmacia = data.results[0];
//       return {
//         name: farmacia.name,
//         location: farmacia.geometry.location,
//         address: farmacia.vicinity,
//         isOpen: farmacia.opening_hours?.open_now,
//         rating: farmacia.rating,
//       };
//     } catch (error) {
//       this.handleError("buscarFarmaciaCercana", error);
//       return null;
//     }
//   }

//   private validateCoordinates(lat: number, lng: number): void {
//     if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
//       throw new Error("Coordenadas geográficas inválidas");
//     }
//   }

//   private async fetchWithRetry(url: string): Promise<Response> {
//     let lastError: Error;

//     for (let i = 0; i < this.config.maxRetries; i++) {
//       try {
//         const controller = new AbortController();
//         const timeout = setTimeout(
//           () => controller.abort(),
//           this.config.timeout
//         );

//         const response = await fetch(url, {
//           signal: controller.signal,
//           headers: {
//             Accept: "application/json",
//             "User-Agent": "NestJS-GoogleMapsService/1.0",
//           },
//         });

//         clearTimeout(timeout);

//         if (response.ok) return response;

//         lastError = new Error(
//           `HTTP ${response.status}: ${response.statusText}`
//         );
//       } catch (error) {
//         lastError = error as Error;
//         await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
//       }
//     }

//     throw lastError;
//   }

//   private async validateResponse(
//     response: Response
//   ): Promise<GoogleMapsApiResponse> {
//     const data = (await response.json()) as GoogleMapsApiResponse;

//     if (data.status !== GoogleMapsStatus.OK) {
//       // Manejo más específico según el tipo de error
//       switch (data.status) {
//         case GoogleMapsStatus.ZERO_RESULTS:
//           throw new HttpException(
//             "No se encontraron resultados",
//             HttpStatus.NOT_FOUND
//           );
//         case GoogleMapsStatus.OVER_QUERY_LIMIT:
//           throw new HttpException(
//             "Límite de consultas excedido",
//             HttpStatus.TOO_MANY_REQUESTS
//           );
//         default:
//           throw new Error(
//             `Google Maps API Error: ${data.status} - ${
//               data.error_message || "Unknown error"
//             }`
//           );
//       }
//     }

//     return data;
//   }

//   private handleError(method: string, error: any): void {
//     if (error instanceof HttpException) {
//       throw error;
//     }

//     this.logger.error(`Error en ${method}: ${error.message}`, error.stack);
//     throw new HttpException(
//       "Error al procesar la solicitud de Google Maps",
//       HttpStatus.INTERNAL_SERVER_ERROR
//     );
//   }
// }
