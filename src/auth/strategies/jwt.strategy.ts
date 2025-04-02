import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
// import { Roles } from "../entities/Usuarios.entity";
import { Roles } from '../../Entities/usuarios.entity';

export interface JwtPayload {
  // id?: number;
  email: string;
  rol: Roles[];
  // iat?: number;
  // exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    return {
      // id: payload.id,
      email: payload.email,
      rol: payload.rol,
    };
  }
}
