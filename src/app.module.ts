import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Usuario } from "./Entities/Usuarios.entity";
import { Medico } from "./Entities/Medico.entity";
import { Cita } from "./Entities/Cita.entity";
import { HistorialMedico } from "./Entities/HistorialMedico.entity";
import { UsuariosModule } from './usuarios/usuarios.module';
import { MedicosModule } from './medicos/medicos.module';
import { CitasModule } from './citas/citas.module';
import { HistorialMedicoModule } from './historial-medico/historial-medico.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '2980',
      database: process.env.DB_NAME || 'citas',
      entities: [Usuario, Medico, Cita, HistorialMedico],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    UsuariosModule,
    MedicosModule,
    CitasModule,
    HistorialMedicoModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
