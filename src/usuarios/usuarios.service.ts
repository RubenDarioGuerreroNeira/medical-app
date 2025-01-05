import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";
import { LoginDto } from "./dto/login-dto";
import { Usuario } from "../Entities/Usuarios.entity";
import { Medico } from "src/Entities/Medico.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { JwtService } from "@nestjs/jwt";
import { MailerService } from "@nestjs-modules/mailer";
import { MailerService as MailServicio } from "../Mail/mailService";
import { AuthService } from "../auth/auth.service";

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Medico)
    private medicoRepository: Repository<Medico>,

    private readonly mailerService: MailerService,
    private readonly servicioMail: MailServicio,
    private readonly jwtService: JwtService,
    private readonly authService: AuthService
  ) {}

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
  // creo el usuario y verifco la identidad enviando un token al email
  // envio el email de bienvenida

  async validaUsuario(datos: CreateUsuarioDto): Promise<Usuario> {
    try {
      const usuario = await this.usuarioRepository.findOneBy({
        apellido: datos.apellido,
        fecha_nacimiento: datos.fecha_nacimiento,
      });

      if (!usuario) {
        throw new NotFoundException("Usuario no Encontrado");
      }
      return usuario;
    } catch (error) {
      throw new error();
    }
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    try {
      const bUsuario = await this.usuarioRepository.findOneBy({
        email: createUsuarioDto.email,
      });

      if (bUsuario) {
        throw new Error("Usuario ya existente");
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPAss = await bcrypt.hash(createUsuarioDto.contrasena, salt);

      const usuario = this.usuarioRepository.create({
        nombre: createUsuarioDto.nombre,
        apellido: createUsuarioDto.apellido,
        fecha_nacimiento: createUsuarioDto.fecha_nacimiento,
        genero: createUsuarioDto.genero,
        direccion: createUsuarioDto.direccion,
        telefonoCelular: createUsuarioDto.telefonoCelular,
        telefonoContacto: createUsuarioDto.telefonoContacto,
        email: createUsuarioDto.email,
        contrasena: hashedPAss,
        rol: createUsuarioDto.rol as Roles,
      });

      const nuevoUsuario = await this.usuarioRepository.save(usuario);

      if (nuevoUsuario.rol === Roles.MEDICO) {
        const nuevoMedico = await this.medicoRepository.save({
          usuario: nuevoUsuario,
          especialidad: createUsuarioDto.especialidad,
          horario_disponible: createUsuarioDto.horario_disponible,
        });
        await this.medicoRepository.save(nuevoMedico);
      }

      const token = await this.authService.generateToken({
        email: nuevoUsuario.email,
        rol: nuevoUsuario.rol,
      });

      // estan hecha spero no he implementado la config del email

      //  Envio Token  al email
      // await this.servicioMail.sendVerificationMail(
      //   nuevoUsuario.email,
      //   nuevoUsuario.nombre,
      //   token
      // );
      // // Envio Email de Bienvenida
      // await this.servicioMail.sendWelcomeMail(
      //   nuevoUsuario.email,
      //   nuevoUsuario.nombre
      // );
      delete nuevoUsuario.contrasena;
      return nuevoUsuario;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  findAll() {
    return `This action returns all usuarios`;
  }

  findOne(usuarioId: string) {
    try {
      const bUsuario = this.usuarioRepository.findOneBy({ id: usuarioId });
      if (!bUsuario) {
        throw new Error("Usuario no encontrado");
      }
      return bUsuario;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(
    usuarioId: string,
    updateUsuarioDto: UpdateUsuarioDto
  ): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOneBy({ id: usuarioId });
    if (!usuario) {
      throw new Error("Usuario no encontrado");
    }

    try {
      // Preparamos los datos actualizados
      const datosActualizados: Partial<Usuario> = {
        ...usuario,
        nombre: updateUsuarioDto.nombre || usuario.nombre,
        apellido: updateUsuarioDto.apellido || usuario.apellido,
        fecha_nacimiento:
          updateUsuarioDto.fecha_nacimiento || usuario.fecha_nacimiento,
        genero: updateUsuarioDto.genero || usuario.genero,
        direccion: updateUsuarioDto.direccion || usuario.direccion,
        telefonoCelular:
          updateUsuarioDto.telefonoCelular || usuario.telefonoCelular,
        telefonoContacto:
          updateUsuarioDto.telefonoContacto || usuario.telefonoContacto,
        email: updateUsuarioDto.email || usuario.email,
        rol: updateUsuarioDto.rol
          ? (updateUsuarioDto.rol as Roles)
          : usuario.rol,
      };

      // Manejamos la contraseña si existe
      if (updateUsuarioDto.contrasena) {
        const salt = await bcrypt.genSalt(10);
        datosActualizados.contrasena = await bcrypt.hash(
          updateUsuarioDto.contrasena,
          salt
        );
      }

      // Verificamos si el email ya existe (solo si se está actualizando)
      if (updateUsuarioDto.email && updateUsuarioDto.email !== usuario.email) {
        const emailExistente = await this.usuarioRepository.findOneBy({
          email: updateUsuarioDto.email,
        });
        if (emailExistente) {
          throw new BadRequestException("El email ya está registrado");
        }
      }

      // Actualizamos y retornamos el usuario
      const usuarioActualizado = await this.usuarioRepository.save({
        ...datosActualizados,
        id: usuarioId,
      });

      // Eliminamos la contraseña de la respuesta
      delete usuarioActualizado.contrasena;

      return usuarioActualizado;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.code === "23505"
          ? "Error de duplicación en datos únicos"
          : "Error al actualizar usuario"
      );
    }
  }

  async remove(usuarioId: string) {
    const bUsuario = this.usuarioRepository.findOneBy({ id: usuarioId });
    if (!bUsuario) {
      throw new Error("Usuario no encontrado");
    }
    try {
      await this.usuarioRepository.delete(usuarioId);
      return {
        message: "Usuario eliminado correctamente",
        status: 200,
      };
    } catch (error) {
      throw new Error("Usuario no encontrado");
    }
  }
  async login(logindto: LoginDto): Promise<any> {
    try {
      const { email, password } = logindto;

      const usuario = await this.usuarioRepository.findOneBy({ email: email });
      if (!usuario) {
        throw new BadRequestException("Usuario no encontrado");
      }

      const passValid = await bcrypt.compare(
        logindto.password,
        usuario.contrasena
      );
      if (!passValid) {
        throw new BadRequestException("Error en Password");
      }
      return this.jwtService.sign({
        email: usuario.email,
        rol: usuario.rol,
      });
    } catch {
      throw new BadRequestException("Error en Login");
    }
  }

  async recoveryUser(datos: CreateUsuarioDto): Promise<Partial<Usuario>> {
    try {
      const usuario = await this.validaUsuario(datos);
      return {
        email: usuario.email,
      } as Partial<Usuario>;
    } catch (error) {
      throw new error();
    }
  }

  async restorePassword(datos: CreateUsuarioDto): Promise<Partial<Usuario>> {
    try {
      const usuario = await this.validaUsuario(datos);
      const hashh = await bcrypt.hash(datos.contrasena, 10);

      await this.usuarioRepository.update(usuario.id, {
        contrasena: hashh,
      });

      return {
        email: usuario.email,
        contrasena: hashh,
      } as Partial<Usuario>;
    } catch (error) {
      throw new error();
    }
  }
} // fin
