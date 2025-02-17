import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  JoinColumn,
  Unique,
} from "typeorm";
import { Cita } from "./cita.entity";
import { HistorialMedico } from "./historialmedico.entity";

export enum Roles {
  ADMIN = "admin",
  MEDICO = "medico",
  PACIENTE = "paciente",
}
@Entity()
export class Usuario {
  @PrimaryGeneratedColumn("uuid") // Columna ID con tipo UUID
  id: string;

  @Column()
  nombre: string;

  @Column()
  apellido: string;

  @Column({ type: "date" })
  fecha_nacimiento: Date;

  @Column()
  genero: string;

  @Column()
  direccion: string;

  @Column()
  telefonoCelular: string;

  @Column()
  telefonoContacto: string;

  @Column({ unique: true }) // Otra forma de definir 'email' como único
  email: string;

  @Column()
  contrasena: string; // Recuerda hashear la contraseña antes de guardarla

  @Column({
    type: "enum",
    enum: Roles,
    default: Roles.PACIENTE,
  })
  rol: Roles;

  @OneToMany(() => Cita, (cita) => cita.paciente)
  citas: Cita[];

  @OneToMany(
    () => HistorialMedico,
    (historialMedico) => historialMedico.paciente
  )
  historialMedico: HistorialMedico[];
}
