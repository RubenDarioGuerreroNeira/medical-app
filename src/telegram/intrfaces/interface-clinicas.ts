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