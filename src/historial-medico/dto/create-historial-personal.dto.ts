export class CreateHistorialPersonalDto {
  paciente_id: string;
  condiciones_cronicas: {
    nombre: string;
    fecha_diagnostico: Date;
    tratamiento_actual: string;
    notas: string;
  }[];
  alergias: {
    nombre: string;
    tipo: string; // medicamento, alimento, ambiental, etc.
    reaccion: string;
    gravedad: string; // leve, moderada, grave
  }[];
  grupo_sanguineo?: string;
  es_compartible?: boolean;
}