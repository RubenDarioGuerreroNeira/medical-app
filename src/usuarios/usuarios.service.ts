import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { CreateUsuarioDto } from "./dto/create-usuario.dto";
import { UpdateUsuarioDto } from "./dto/update-usuario.dto";
import { Usuario } from "../Entities/Usuarios.entity";
import { Medico } from "../Entities/Medico.entity";
import { Roles } from "../Entities/Usuarios.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { PaginatedResult } from "src/Dto Pagination/Pagination";
import { RegisterUserDto } from "./dto/register-user.dto";

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository: Repository<Usuario>,
    @InjectRepository(Medico)
    private medicoRepository: Repository<Medico>
  ) {}

  async validatePassword(
    plainPassword: string,
    hashedPassword: string
  ): Promise<boolean> {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  async register(registerUserDto: RegisterUserDto): Promise<Usuario> {
    const {
      nombre,
      apellido,
      fecha_nacimiento,
      genero,
      direccion,
      telefonoCelular,
      telefonoContacto,
      email,
      contrasena,
    } = registerUserDto;

    // Verifica si el correo electrónico ya existe
    const existingUser = await this.usuarioRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictException("El correo electrónico ya está registrado.");
    }

    // Hashea la contraseña
    const hashedPassword = await bcrypt.hash(contrasena, 10);

    // Crea el usuario
    const newUser = this.usuarioRepository.create({
      nombre,
      apellido,
      fecha_nacimiento,
      genero,
      direccion,
      telefonoCelular,
      telefonoContacto,
      email,
      contrasena: hashedPassword,
      rol: Roles.PACIENTE, // Por defecto
    });

    // Guarda el usuario
    try {
      const usuario = await this.usuarioRepository.save(newUser);
      delete usuario.contrasena;
      return usuario;
    } catch (e) {
      throw new HttpException(
        "Error al crear el usuario",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async create(createUsuarioDto: CreateUsuarioDto): Promise<Usuario> {
    const existingUser = await this.usuarioRepository.findOneBy({
      email: createUsuarioDto.email,
    });

    if (existingUser) {
      throw new ConflictException("El correo electrónico ya está registrado.");
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

    delete nuevoUsuario.contrasena;
    return nuevoUsuario;
  }

  async findAll(): Promise<PaginatedResult<Usuario>> {
    // Por ahora, devolvemos todos los usuarios sin paginación real.
    // Se puede añadir lógica de paginación con `take` y `skip` si es necesario.
    const [usuarios, total] = await this.usuarioRepository.findAndCount({
      order: { nombre: "ASC" },
    });

    // Ocultar contraseñas
    usuarios.forEach((user) => delete user.contrasena);

    return {
      data: usuarios,
      meta: {
        total,
        page: 1,
        limit: total,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
    };
  }

  async findOne(usuarioId: string): Promise<Usuario> {
    const user = await this.usuarioRepository.findOneBy({ id: usuarioId });
    if (!user) {
      throw new NotFoundException(
        `Usuario con ID '${usuarioId}' no encontrado.`
      );
    }
    delete user.contrasena;
    return user;
  }

  /**
   * Busca un usuario por email para propósitos de autenticación.
   * A diferencia de `findOne`, este método SÍ devuelve la contraseña.
   * @param email El email del usuario a buscar.
   */
  async findOneByEmailForAuth(email: string): Promise<Usuario | undefined> {
    return this.usuarioRepository.findOne({ where: { email } });
  }

  async update(
    usuarioId: string,
    updateUsuarioDto: UpdateUsuarioDto,
    authenticatedUser: { id: string; rol: Roles }
  ): Promise<Usuario> {
    if (
      authenticatedUser.rol !== Roles.ADMIN &&
      authenticatedUser.id !== usuarioId
    ) {
      throw new ForbiddenException("No autorizado para realizar esta acción");
    }
    const usuario = await this.usuarioRepository.findOneBy({ id: usuarioId });
    if (!usuario) {
      throw new NotFoundException(
        `Usuario con ID '${usuarioId}' no encontrado.`
      );
    }

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
      rol: updateUsuarioDto.rol ? (updateUsuarioDto.rol as Roles) : usuario.rol,
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
        throw new ConflictException("El email ya está registrado");
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
  }

  async remove(usuarioId: string): Promise<void> {
    const result = await this.usuarioRepository.delete(usuarioId);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Usuario con ID '${usuarioId}' no encontrado.`
      );
    }
  }
} // fin
