import { Injectable } from "@nestjs/common";

export interface Clinica {
  id: string;
  nombre: string;
  estado: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  especialidades: string[];
  horario: string;
  emergencia24h: boolean;
  coordenadas?: {
    lat: number;
    lng: number;
  };
}

@Injectable()
export class ClinicasVenezuelaService {
  private clinicas: Clinica[] = [
    {
      id: "1",
      nombre: "Policlínica Táchira",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion:
        "Av. 19 de Abril, Edif. Policlínica Táchira, Las Acacias, San Cristobal",
      telefono:
        "+58 (0276)349.0300 - 0276)349.0400 - (0276)349.0387 - (0276)349.0341",
      especialidades: ["Cardiología", "Pediatría", "Traumatología"],
      horario: "24 horas",
      emergencia24h: true,
      coordenadas: {
        lat: 10.506098,
        lng: -66.886967,
      },
    },
    {
      id: "2",
      nombre: "Urologico Hospital Clínico",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion:
        "Carrera 19, Barrio Obrero 3 cuadras bajando de La Plaza los Mangos",
      telefono: "(0412)129.0651 - +58 (0276)349.8091",
      especialidades: ["Medicina General", "Ginecología", "Oftalmología", ""],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 10.498765,
        lng: -66.879543,
      },
    },

    {
      id: "3",
      nombre: "Centro de Cirugía San Sebastian",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion:
        "Av. Principal de Pueblo Nuevo, Centro de Cirugía San Sebastián, Pueblo Nuevo, Al lado de Residencias el Bosque",
      telefono: "(0414)706.0954 - +58 (0276)342.2266",
      especialidades: ["Medicina General", "Ginecología", "Oftalmología"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 10.498765,
        lng: -66.879543,
      },
    },
    {
      id: "4",
      nombre: "Centro Médico Quirúrgico La Trinidad",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion:
        "Av. Los Agustinos, Conjunto Res. Paramillo, Casa Nº. 1, Zona Industrial Paramillo",
      telefono: "+58 (0276)510.5690 - (0276)510.5600 - (0276)510.5698",
      especialidades: ["Medicina General", "Ginecología", "Oftalmología"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 10.498765,
        lng: -66.879543,
      },
    },
  ];

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
