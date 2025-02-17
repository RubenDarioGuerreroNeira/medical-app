import { SetMetadata } from "@nestjs/common";
import { Roles } from "../entities/Usuarios.entity";

export const ROLES_KEY = "roles";
export const RequireRoles = (...roles: Roles[]) =>
  SetMetadata(ROLES_KEY, roles);
