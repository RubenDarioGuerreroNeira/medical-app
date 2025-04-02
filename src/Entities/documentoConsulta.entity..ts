import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Cita } from "./cita.entity";

@Entity("documento_consultas")
export class DocumentoConsulta {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => Cita)
  @JoinColumn({ name: "cita_id" })
  cita: Cita;

  @Column()
  nombre_archivo: string;

  @Column()
  tipo_documento: string;

  @Column()
  url_archivo: string;

  @Column({ type: "timestamp" })
  fecha_subida: Date;
}
