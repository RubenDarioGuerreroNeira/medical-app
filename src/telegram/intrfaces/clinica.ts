interface Clinica {
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  coordenadas: {
    lat: number;
    lng: number;
  };
  horario: string;
  especialidades: string[];
  emergencia24h: boolean;
}
