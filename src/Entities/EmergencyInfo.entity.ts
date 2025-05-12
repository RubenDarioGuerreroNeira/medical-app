import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('emergency_info')
export class EmergencyInfo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'bigint' })
  userId: string;

  @Column({ type: 'bigint' })
  chatId: string;

  @Column({ type: 'text', nullable: true })
  allergies: string;

  @Column({ type: 'text', nullable: true })
  conditions: string;

  @Column({ type: 'text', nullable: true })
  emergencyContact: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  accessCode: string;

  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  @Column({ type: 'timestamp' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  updatedAt: Date;
}