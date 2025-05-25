import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

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
}
