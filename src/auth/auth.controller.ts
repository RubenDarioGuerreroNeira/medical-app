import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LoginDto } from "../usuarios/dto/login-dto";
import { LoginResponseDto } from "../usuarios/dto/login-response.dto";
import { PasswordRecoveryRequestDto } from "./dto/password-recovery.dto";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Iniciar sesión de usuario" })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "Login exitoso, devuelve un token JWT.",
    type: LoginResponseDto,
  })
  @ApiResponse({ status: 401, description: "Credenciales inválidas." })
  login(@Body() loginDto: LoginDto): Promise<{ token: string }> {
    // La lógica de login ahora debería estar en AuthService
    return this.authService.login(loginDto);
  }

  @Post("recover-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Solicitar recuperación de contraseña" })
  @ApiBody({ type: PasswordRecoveryRequestDto })
  @ApiResponse({
    status: 200,
    description:
      "Si el correo existe, se enviarán instrucciones para recuperar la contraseña.",
  })
  async requestPasswordRecovery(
    @Body() recoveryDto: PasswordRecoveryRequestDto
  ): Promise<{ message: string }> {
    // La lógica para enviar el email de recuperación ahora debería estar en AuthService
    await this.authService.sendRecoveryLink(recoveryDto.email);
    return {
      message:
        "Si existe una cuenta con ese correo, se han enviado las instrucciones de recuperación.",
    };
  }
}
