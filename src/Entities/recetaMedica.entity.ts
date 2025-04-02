import { Cita } from "./cita.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("receta_medica")
export class RecetaMedica {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: "cita_id" })
  cita: Cita;

  @Column({ type: "text" })
  medicamentos: string;

  @Column({ type: "text" })
  indicaciones: string;

  @Column({ type: "timestamp" })
  fecha_emision: Date;

  @Column({ nullable: true })
  archivo_url: string;
}
