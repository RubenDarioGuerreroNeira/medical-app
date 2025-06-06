// import { timeStamp } from "console";
import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("medication_reminder")
export class MedicationReminder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint" }) // Cambiado para manejar IDs de Telegram
  userId: string;

  @Column({ type: "bigint" }) // Cambiado para manejar IDs de Telegram
  chatId: string;

  @Column()
  medicationName: string;

  @Column()
  dosage: string;

  @Column("time")
  reminderTime: string;

  @Column("simple-array")
  daysOfWeek: number[];

  @Column({ default: true })
  isActive: boolean;

  @Column()
  timezone: string;

  @Column()
  type: string;

  @Column({ type: "timestamp" })
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  updatedAt: Date;

  @Column({ type: "timestamp", nullable: true })
  lastTaken: Date;

  @Column({
    type: "simple-array",
    nullable: true,
    default: () => "'{}'",
  })
  timesTaken: Date[]; // Aqui se Guarda las Fechas en las que se tomo el medicamento
}
