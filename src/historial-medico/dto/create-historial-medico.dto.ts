export class CreateHistorialMedicoDto {
  paciente_id: string;
  medico_id: string;
  description: string;
  fecha_creacion: Date;
  diagostico: string;
  tratamiento: string;
  datos_medicos: any;
}
