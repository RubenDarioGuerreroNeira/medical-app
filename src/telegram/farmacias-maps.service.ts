import { Injectable, Logger, HttpException, HttpStatus } from "@nestjs/common";
import fetch, { Response } from "node-fetch";
import { Clinica } from "./intrfaces/interface-clinicas";

import {
  Location,
  PharmacyResponse,
  NominatimResponse,
  OSMPlace,
  ClinicaResponse,
} from "./intrfaces/osm.interface";
import axios from "axios";

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
  private readonly OVERPASS_BASE_URL =
    "https://overpass-api.de/api/interpreter";
  constructor() {}

  async buscarFarmaciasEnTachira(): Promise<Location[] | null> {
    try {
      const query = "Farmacias Cercanas";
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
  ): Promise<PharmacyResponse[] | null> {
    try {
      this.validateCoordinates(latitude, longitude);

      // Usar Overpass API para buscar farmacias cercanas
      const overpassQuery = `
        [out:json];
        (
          node["amenity"="pharmacy"](around:1000,${latitude},${longitude});
          way["amenity"="pharmacy"](around:1000,${latitude},${longitude});
          relation["amenity"="pharmacy"](around:1000,${latitude},${longitude});
        );
        out body;
        >;
        out skel qt;
      `;

      const url = this.OVERPASS_BASE_URL;
      const params = new URLSearchParams({
        data: overpassQuery,
      });

      const response = await axios.post(url, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "TelegramBot/1.0",
        },
      });

      if (
        !response.data ||
        !response.data.elements ||
        response.data.elements.length === 0
      ) {
        this.logger.warn("No se encontraron farmacias cercanas");
        return null;
      }

      // Procesar los resultados
      const farmacias = response.data.elements
        .filter(
          (element) => element.tags && element.tags.amenity === "pharmacy"
        )
        .map((element) => {
          return {
            name: element.tags.name || "Farmacia",
            location: {
              lat:
                element.lat || (element.center ? element.center.lat : latitude),
              lng:
                element.lon ||
                (element.center ? element.center.lon : longitude),
            },
            address:
              [element.tags["addr:street"], element.tags["addr:housenumber"]]
                .filter(Boolean)
                .join(" ") || "Dirección no disponible",
            isOpen: element.tags.opening_hours
              ? this.checkIfOpen(element.tags.opening_hours)
              : false,
            rating: null,
            telefono:
              element.tags.phone || element.tags["contact:phone"] || null,
            horario: element.tags.opening_hours || "Horario no disponible",
          };
        });

      return farmacias.length > 0 ? farmacias : null;
    } catch (error) {
      this.handleError("buscarFarmaciaCercana", error);
      return null;
    }
  }

  // Método auxiliar para verificar si está abierto según el horario
  private checkIfOpen(openingHours: string): boolean {
    try {
      // Implementación básica, se puede mejorar
      const now = new Date();
      const day = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][now.getDay()];
      const time = now.getHours() * 100 + now.getMinutes();

      // Buscar el día actual en el string de horarios
      if (openingHours.includes(day)) {
        const dayPattern = new RegExp(
          `${day}\\s+(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`
        );
        const match = openingHours.match(dayPattern);

        if (match) {
          const [_, openTime, closeTime] = match;
          const [openHour, openMin] = openTime.split(":").map(Number);
          const [closeHour, closeMin] = closeTime.split(":").map(Number);

          const openTimeValue = openHour * 100 + openMin;
          const closeTimeValue = closeHour * 100 + closeMin;

          return time >= openTimeValue && time <= closeTimeValue;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  async buscarClinicaCercana(
    latitude: number,
    longitude: number
  ): Promise<ClinicaResponse[] | null> {
    try {
      this.validateCoordinates(latitude, longitude);

      // Usar Overpass API para buscar clinicas  cercanas
      const overpassQuery = `
        [out:json];
        (
          node["amenity"="hospital"](around:2000,${latitude},${longitude});
        way["amenity"="hospital"](around:2000,${latitude},${longitude});
        node["amenity"="clinic"](around:2000,${latitude},${longitude});
        way["amenity"="clinic"](around:2000,${latitude},${longitude});
        node["healthcare"="hospital"](around:2000,${latitude},${longitude});
        way["healthcare"="hospital"](around:2000,${latitude},${longitude});
        node["healthcare"="clinic"](around:2000,${latitude},${longitude});
        way["healthcare"="clinic"](around:2000,${latitude},${longitude});
        );
        out body;
        >;
        out skel qt;
      `;

      const url = this.OVERPASS_BASE_URL;
      const params = new URLSearchParams({
        data: overpassQuery,
      });

      const response = await axios.post(url, params.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "TelegramBot/1.0",
        },
      });

      if (
        !response.data ||
        !response.data.elements ||
        response.data.elements.length === 0
      ) {
        this.logger.warn("No se encontraron Centros de atención cercanos");
        return null;
      }

      // Procesar los resultados
      const centros = response.data.elements
        .filter((element) => {
          return (
            element.tags &&
            (element.tags.amenity === "hospital" ||
              element.tags.amenity === "cdi" ||
              element.tags.amenity === "clinic" ||
              element.tags.amenity === "clinic" ||
              element.tags.amenity === "cdi" ||
              element.tags.healthcare === "hospital" ||
              element.tags.healthcare === "clinic")
          );
        })
        .map((element) => {
          // Determinamos el tipo de centro médico
          const isCentroEmergencia =
            element.tags.emergency === "yes" ||
            element.tags.healthcare === "emergency" ||
            element.tags.emergency_service === "yes";

          // Extraemos las especialidades si existen
          const especialidades = element.tags.healthcare_speciality
            ? element.tags.healthcare_speciality.split(";")
            : ["Medicina General"];

          return {
            id: element.id.toString(),
            name: element.tags.name || "Centro Médico",
            location: {
              lat:
                element.lat || (element.center ? element.center.lat : latitude),
              lng:
                element.lon ||
                (element.center ? element.center.lon : longitude),
            },
            address:
              [element.tags["addr:street"], element.tags["addr:housenumber"]]
                .filter(Boolean)
                .join(" ") || "Dirección no disponible",
            city: element.tags["addr:city"] || "Ciudad no especificada",
            state: element.tags["addr:state"] || "Estado no especificado",
            telefono:
              element.tags.phone ||
              element.tags["contact:phone"] ||
              "Teléfono no disponible",
            horario: element.tags.opening_hours || "Horario no disponible",
            especialidades: especialidades,
            emergencia24h: isCentroEmergencia,
            rating: null,
          };
        });

      return centros.length > 0 ? centros : null;
    } catch (error) {
      this.handleError("buscarClinicaCercana", error);
      return null;
    }
  }

  // Método auxiliar para verificar si está abierto según el horario
  private checkIfCentroOpen(openingHours: string): boolean {
    try {
      // Implementación básica, se puede mejorar
      const now = new Date();
      const day = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"][now.getDay()];
      const time = now.getHours() * 100 + now.getMinutes();

      // Buscar el día actual en el string de horarios
      if (openingHours.includes(day)) {
        const dayPattern = new RegExp(
          `${day}\\s+(\\d{2}:\\d{2})-(\\d{2}:\\d{2})`
        );
        const match = openingHours.match(dayPattern);

        if (match) {
          const [_, openTime, closeTime] = match;
          const [openHour, openMin] = openTime.split(":").map(Number);
          const [closeHour, closeMin] = closeTime.split(":").map(Number);

          const openTimeValue = openHour * 100 + openMin;
          const closeTimeValue = closeHour * 100 + closeMin;

          return time >= openTimeValue && time <= closeTimeValue;
        }
      }

      return false;
    } catch (e) {
      return false;
    }
  }

  private formatClinicData(data: any): Clinica {
    const address = data.address || {};

    return {
      id: data.place_id || "ID no disponible", // Asegúrate de proporcionar un valor para 'id'
      estado: address.state || "Estado no Disponible",
      nombre: data.name || data.display_name.split(",")[0],
      direccion: this.formatAddress(address),
      ciudad: address.city || address.town || address.state || "Venezuela",
      telefono: address.phone || "No disponible",
      coordenadas: {
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon),
      },
      horario: "Horario no disponible",
      especialidades: ["Todas las especialidades"],
      emergencia24h: false,
    };
  }

  private formatAddress(address: any): string {
    const components = [];
    if (address.road) components.push(address.road);
    if (address.house_number) components.push(address.house_number);
    if (address.suburb) components.push(address.suburb);
    if (address.city || address.town)
      components.push(address.city || address.town);
    return components.join(", ") || "Dirección no disponible";
  }

  // VALIDAR COORDENADAS
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
