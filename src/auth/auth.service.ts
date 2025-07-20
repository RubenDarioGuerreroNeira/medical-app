import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { LoginDto } from "src/usuarios/dto/login-dto";
import { UsuariosService } from "src/usuarios/usuarios.service";
import { Usuario } from "src/Entities/Usuarios.entity";

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usuariosService: UsuariosService
  ) {}

  async login(loginDto: LoginDto): Promise<{ token: string }> {
    const { email, password } = loginDto;

    // Usamos el nuevo método del servicio para obtener el usuario con su contraseña
    const usuario: Usuario = await this.usuariosService.findOneByEmailForAuth(
      email
    );

    if (!usuario) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const isPasswordValid = await this.usuariosService.validatePassword(
      password,
      usuario.contrasena
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException("Credenciales inválidas");
    }

    const payload = { email: usuario.email, sub: usuario.id, rol: usuario.rol };
    return {
      token: this.jwtService.sign(payload),
    };
  }
  async generateToken(payload: any) {
    return this.jwtService.sign(payload);
  }

  async decodeToken(token: string) {
    return this.jwtService.decode(token);
  }

  async sendRecoveryLink(email: string): Promise<void> {
    // Aquí iría la lógica para generar un token de recuperación y enviarlo por correo.
    console.log(`Enviando link de recuperación a ${email}`);
  }
}
