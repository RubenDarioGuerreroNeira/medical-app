import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum BloodType {
  A = "A",
  B = "B",
  AB = "AB",
  O = "O",
}

export enum RhFactor {
  POSITIVE = "Positivo",
  NEGATIVE = "Negativo",
}

@Entity("emergency_info")
export class EmergencyInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "bigint" })
  userId: string;

  @Column({ type: "bigint" })
  chatId: string;

  @Column({ type: "text", nullable: true })
  allergies: string;

  @Column({ type: "text", nullable: true })
  conditions: string;

  @Column({ type: "text", nullable: true })
  emergencyContact: string;

  @Column({ type: "varchar", length: 10, nullable: true })
  accessCode: string;

  @Column({ type: "boolean", default: false })
  isPublic: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn({ nullable: true })
  updatedAt: Date;

  @Column({ type: "boolean", default: false })
  tieneSeguro: boolean;

  @Column({ type: "varchar", length: 100, nullable: true })
  seguro: string;

  @Column({ type: "enum", enum: BloodType, nullable: true })
  bloodType: BloodType;

  @Column({ type: "enum", enum: RhFactor, nullable: true })
  rhFactor: RhFactor;
}
