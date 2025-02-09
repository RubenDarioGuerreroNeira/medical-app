import { Injectable } from "@nestjs/common";
import { ClinicasVenezuela } from "./datos/clinica-datos";
import { Clinica } from "./intrfaces/interface-clinicas";
@Injectable()
export class ClinicasVenezuelaService {
  private clinicas: Clinica[] = ClinicasVenezuela;
  async buscarClinicas(params: {
    estado?: string;
    ciudad?: string;
    especialidad?: string;
  }): Promise<Clinica[]> {
    let resultado = this.clinicas;

    if (params.estado) {
      resultado = resultado.filter(
        (clinica) =>
          clinica.estado.toLowerCase() === params.estado.toLowerCase()
      );
    }

    if (params.ciudad) {
      resultado = resultado.filter(
        (clinica) =>
          clinica.ciudad.toLowerCase() === params.ciudad.toLowerCase()
      );
    }

    if (params.especialidad) {
      resultado = resultado.filter((clinica) =>
        clinica.especialidades.some(
          (esp) => esp.toLowerCase() === params.especialidad.toLowerCase()
        )
      );
    }

    return resultado;
  }

  async obtenerClinicaCercana(
    lat: number,
    lng: number
  ): Promise<Clinica | null> {
    if (this.clinicas.length === 0) return null;

    let clinicaCercana = this.clinicas[0];
    let distanciaMinima = this.calcularDistancia(
      lat,
      lng,
      clinicaCercana.coordenadas.lat,
      clinicaCercana.coordenadas.lng
    );

    for (const clinica of this.clinicas) {
      if (!clinica.coordenadas) continue;

      const distancia = this.calcularDistancia(
        lat,
        lng,
        clinica.coordenadas.lat,
        clinica.coordenadas.lng
      );

      if (distancia < distanciaMinima) {
        distanciaMinima = distancia;
        clinicaCercana = clinica;
      }
    }

    return clinicaCercana;
  }

  private calcularDistancia(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(grados: number): number {
    return (grados * Math.PI) / 180;
  }
}
