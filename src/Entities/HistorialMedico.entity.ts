import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from "typeorm";
import { Usuario } from "./usuarios.entity";
import { Medico } from "./medico.entity";

@Entity()
export class HistorialMedico {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Usuario, (usuario) => usuario.historialMedico)
  @JoinColumn({ name: "paciente_id" })
  paciente: Usuario;

  @ManyToOne(() => Medico, (medico) => medico.historialesMedicos)
  @JoinColumn({ name: "medico_id" })
  medico: Medico;

  @Column({ type: "text" }) // Permite textos largos
  descripcion: string;

  @CreateDateColumn({ type: "timestamptz" }) // Automatiza la fecha y hora de creación
  fecha_creacion: Date;

  //  Posibles mejoras adicionales:
  @Column({ nullable: true })
  diagnostico: string;

  @Column({ nullable: true })
  tratamiento: string;

  @Column({ nullable: true, type: "jsonb" }) // Para guardar datos médicos complejos como resultados de laboratorio.
  datos_medicos: any;
}
