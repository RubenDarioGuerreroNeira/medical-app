import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn
} from "typeorm";

@Entity("telegram_historial_medico")
export class TelegramHistorialMedico {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint" })
  userId: string;

  @Column({ type: "bigint" })
  chatId: string;

  @Column()
  diagnostico: string;

  @Column({ nullable: true })
  tratamiento: string;

  @Column({ type: "text", nullable: true })
  descripcion: string;

  @Column({ nullable: true })
  nombreMedico: string;

  @Column({ nullable: true })
  especialidadMedico: string;

  @Column({ nullable: true })
  centroMedico: string;

  @Column({ type: "jsonb", nullable: true })
  condicionesCronicas: any;

  @Column({ type: "jsonb", nullable: true })
  alergias: any;

  @Column({ nullable: true })
  grupoSanguineo: string;

  @Column({ default: false })
  esCompartible: boolean;

  @CreateDateColumn({ type: "timestamp" })
  fechaConsulta: Date;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;
}