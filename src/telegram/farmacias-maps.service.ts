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
