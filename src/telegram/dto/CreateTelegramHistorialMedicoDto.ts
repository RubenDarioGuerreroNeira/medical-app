export class CreateTelegramHistorialMedicoDto {
  userId: string;
  chatId: number;
  diagnostico?: string;
  tratamiento?: string;
  descripcion?: string;
  nombreMedico: string;
  especialidadMedico: string;
  centroMedico: string;
  condiciones_cronicas?: any;
  alergias?: any;
  grupoSanguineo?: string;
  esCompartible?: boolean;
  fechaConsulta?: Date;
  createdAt: Date;
  updatedAt?: Date;
}
