import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity("medical_appointment")
export class MedicalAppointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint" })
  userId: string;

  @Column({ type: "bigint" })
  chatId: string;

  @Column()
  doctorName: string;

  @Column()
  specialty: string;

  @Column()
  appointmentDate: Date;

  @Column("time")
  appointmentTime: string;

  @Column()
  medicalCenterName: string;

  @Column({ nullable: true })
  medicalCenterLocation: string;

  @Column({ nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  notes: string;

  @Column({ default: true })
  isActive: boolean;

  @Column()
  timezone: string;

  @Column({ default: "appointment" })
  type: string;

  @Column({ type: "timestamp" })
  createdAt: Date;

  @Column({ type: "timestamp", nullable: true })
  updatedAt: Date;
}