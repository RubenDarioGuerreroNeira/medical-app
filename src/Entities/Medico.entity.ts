import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Usuario } from "./usuarios.entity"; // Asegúrate de importar la entidad Usuario
import { Cita } from "./cita.entity"; // Asegúrate de importar la entidad Cita
import { HistorialMedico } from "./historialmedico.entity";

@Entity()
export class Medico {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Usuario) // Relación uno a uno con Usuario
  @JoinColumn({ name: "usuario_id" }) // Nombre de la columna en la base de datos
  usuario: Usuario;

  @OneToMany(() => HistorialMedico, (historialMedico) => historialMedico.medico)
  historialesMedicos: HistorialMedico[];

  @OneToMany(() => Cita, (cita) => cita.medico)
  citas: Cita[];

  @Column({ unique: true, nullable: true })
  numeroColegiado: string;

  @Column({ unique: true, default: "Indique la Especialidad" })
  especialidad: string;

  @Column({ type: "date", default: () => "CURRENT_DATE" })
  fechaContratacion: Date;

  @Column({ default: true })
  activo: boolean;

  @Column({ nullable: true })
  fotoPerfil: string;

  @Column("simple-array", { nullable: true })
  certificaciones: string[];

  @Column("simple-array", { nullable: true })
  idiomas: string[];

  @Column({ type: "jsonb" }) // Recomendado para horarios complejos
  horario_disponible: any; // Define el tipo adecuado para tu horario
}

/*
ejemplo de horario:
[
  { "dia": "lunes", "inicio": "08:00", "fin": "14:00" },
  { "dia": "martes", "inicio": "10:00", "fin": "16:00" },
  // ... otros días
]


*/
