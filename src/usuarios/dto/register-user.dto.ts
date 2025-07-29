import { ApiProperty } from "@nestjs/swagger";
import {
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";

export class RegisterUserDto {
  @ApiProperty({ description: "Nombre del usuario", example: "Jane Doe" })
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @ApiProperty({ description: "Apellido del usuario", example: "Doe" })
  @IsString()
  @IsNotEmpty()
  apellido: string;

  @ApiProperty({ description: "Fecha de Nacimiento", example: "2000-01-01" })
  @IsDate()
  @IsNotEmpty()
  fecha_nacimiento: Date;

  @ApiProperty({ description: "Genero", example: "Masculino" })
  @IsString()
  @IsNotEmpty()
  genero: string;

  @ApiProperty({ description: "Dirección", example: "Calle 1, 123" })
  @IsString()
  @IsNotEmpty()
  direccion: string;

  @ApiProperty({ description: "Teléfono Celular", example: "123456789" })
  @IsString()
  @IsNotEmpty()
  telefonoCelular: string;

  @ApiProperty({ description: "Teléfono de Contacto", example: "123456789" })
  @IsString()
  @IsNotEmpty()
  telefonoContacto: string;

  @ApiProperty({
    description: "Correo electrónico del usuario",
    example: "jane.doe@example.com",
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: "Contraseña del usuario",
    example: "password123",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: "La contraseña debe tener al menos 6 caracteres" })
  contrasena: string;
}
