import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Usuario } from "./Usuarios.entity"; // Importa la entidad Usuario
import { Medico } from "./Medico.entity"; // Importa la entidad Medico

export enum EstadoCita {
  CONFIRMADA = "confirmada",
  CANCELADA = "cancelada",
  COMPLETADA = "completada",
}

@Entity()
export class Cita {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.citas) // Relación muchos a uno con Usuario
  @JoinColumn({ name: "paciente_id" }) // Nombre de la columna en la base de datos
  paciente: Usuario;

  @ManyToOne(() => Medico, (medico) => medico.citas) // Relación muchos a uno con Medico
  @JoinColumn({ name: "medico_id" }) // Nombre de la columna en la base de datos
  medico: Medico;

  @Column({ type: "timestamp" }) //  timestamp para almacenar fecha y hora
  fecha_hora: Date;

  @Column({ type: "enum", enum: EstadoCita }) // Usamos un enum para el estado
  estado: EstadoCita;
}
