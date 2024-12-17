import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Usuario } from "./Usuarios.entity"; // Asegúrate de importar la entidad Usuario
import { Cita } from "./Cita.entity"; // Asegúrate de importar la entidad Cita

@Entity()
export class Medico {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @OneToOne(() => Usuario) // Relación uno a uno con Usuario
  @JoinColumn({ name: "usuario_id" }) // Nombre de la columna en la base de datos
  usuario: Usuario;

  @Column()
  especialidad: string;

  @Column({ type: "jsonb" }) // Recomendado para horarios complejos
  horario_disponible: any; // Define el tipo adecuado para tu horario

  @OneToMany(() => Cita, (cita) => cita.medico)
  citas: Cita[];
}

/*
ejemplo de horario:
[
  { "dia": "lunes", "inicio": "08:00", "fin": "14:00" },
  { "dia": "martes", "inicio": "10:00", "fin": "16:00" },
  // ... otros días
]


*/
