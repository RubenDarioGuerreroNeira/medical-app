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
      nombre: "Clinica el Samán",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Av. Libertador - Rdoma dle Educador",
      telefono: "04140854174", // Agregado código de área
      especialidades: ["Todas las Especialidades"],
      horario: "24 horas",
      emergencia24h: true,
      coordenadas: {
        lat: 7.778356783838923,
        lng: -72.23430507697839,
      },
    },
    {
      id: "2",
      nombre: "Centro Cliníco San Cristóbal",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "La Guayana , Frente a la Escuela de Artes Plásticas",
      telefono: "04168963965", // Removidos espacios extra
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.779887,
        lng: -72.226291,
      },
    },
    {
      id: "3",
      nombre: "Centro de Cirugía San Sebastian",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion:
        "Av. Principal de Pueblo Nuevo, Centro de Cirugía San Sebastián, Pueblo Nuevo, Al lado de Residencias el Bosque",
      telefono: "04149635474", // Removido espacio al final
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.782711422373458,
        lng: -72.21794496163493,
      },
    },
    {
      id: "4",
      nombre: "CEMOC",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Centro Comercial Paseo la Villa, Av. Guayana",
      telefono: "04160897020", // Corregido número
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.782736,
        lng: -72.225904,
      },
    },

    {
      id: "5",
      nombre: "Protección Civil",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Pueblo Nuevo Parte Alta, Cruce a mano Izquierda de los PAbellones",
      telefono: "04160897020", // Corregido número
      especialidades: ["Primeros Auxilios"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.787633,
        lng: -72.202968,
      },
    },


    {
      id: "6",
      nombre: "Policliníca Táchira",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Av 19 de Abril, frente a Residencias el Parque, Parque Metropolitano",
      telefono: "04160897020", // Corregido número
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.757779,
        lng: -72.218912,
      },   
    },


    {
      id: "7",
      nombre: "Hospital Central",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Av Lucio Oquendo Frente al Colegio de Médicos",
      telefono: "04160897020", 
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.756495,     
        lng: -72.226321 
      },
    },

    {
      id: "8",
      nombre: "Centro Médico Club de Leones",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Av. Principal La Castra, San Cristóbal 5001, Táchira",
      telefono: "04160897020", 
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.752030,
        lng: -72.226182 
      },
    },


 {
      id: "9",
      nombre: "Hospital Militar",
      estado: "Táchira",
      ciudad: "San Cristóbal",
      direccion: "Via la Cueva del Oso Pueblo Nuevo ",
      telefono: "04160897020", 
      especialidades: ["Todas las Especialidades"],
      horario: "Lunes a Domingo 24h",
      emergencia24h: true,
      coordenadas: {
        lat: 7.798255, 
        lng: -72.194435
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
