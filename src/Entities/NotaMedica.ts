import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Cita } from "./cita.entity";

@Entity()
export class NotaMedica {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: "cita_id" })
  cita: Cita;

  @Column({ type: "text" })
  contenido: string;

  @Column({ type: "timestamp" })
  fecha_creacion: Date;

  @Column({ default: true })
  es_privada: boolean;
}
