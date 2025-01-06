export class CreateMedicoDto {
  numeroColegiado: string;
  especialidad: string;
  fechaContratacion: Date;
  activo: boolean;
  fotoPerfil: string;
  certificaciones: string[];
  idiomas: string[];
  horario_disponible: any;
}
