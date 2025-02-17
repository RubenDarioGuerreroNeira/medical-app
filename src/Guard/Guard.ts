import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Roles } from "src/entities/Usuarios.entity";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<Roles[]>("roles", context.getHandler());
    if (!roles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.rol) {
      return false;
    }
    return this.matchRoles(roles, user.rol as Roles);
  }
  private matchRoles(roles: Roles[], userRole: Roles): boolean {
    return roles.includes(userRole);
  }
}
