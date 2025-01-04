export class CreateHistorialMedicoDto {
  descripcion: string;
  fecha_creacion: Date;
  diagnostico: string;
  tratamiento: string;
  datos_medicos: any;
  paciente_id: string;
  medico_id: string;
}
