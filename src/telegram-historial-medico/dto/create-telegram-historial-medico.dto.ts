export class CreateTelegramHistorialMedicoDto {
  userId: string;
  chatId: string;
  diagnostico: string;
  tratamiento?: string;
  descripcion?: string;
  nombreMedico?: string;
  especialidadMedico?: string;
  centroMedico?: string;
  condicionesCronicas?: any;
  alergias?: any;
  grupoSanguineo?: string;
  esCompartible?: boolean;
  fechaConsulta?: Date;
}