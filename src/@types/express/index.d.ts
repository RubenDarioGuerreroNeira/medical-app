import { Roles } from ".././Usuarios/Entities/Usuarios.entity";

// Este archivo extiende el objeto Request de Express para incluir la propiedad `user`
// que es adjuntada por el JwtAuthGuard después de validar el token JWT.

declare global {
  namespace Express {
    export interface User {
      id: string;
      email: string;
      rol: Roles;
    }

    export interface Request {
      user?: User;
    }
  }
}
