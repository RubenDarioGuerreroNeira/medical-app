import { HttpException, Injectable } from "@nestjs/common";
import { CreateMedicoDto } from "./dto/create-medico.dto";
import { UpdateMedicoDto } from "./dto/update-medico.dto";
import { Medico } from "src/Entities/Medico.entity";
import { Usuario, Roles } from "src/Entities/Usuarios.entity";
import { CreateUsuarioDto } from "src/usuarios/dto/create-usuario.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache } from "cache-manager";
import { Inject } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PaginatedResult, PaginationDto } from "src/Dto Pagination/Pagination";

@Injectable()
export class MedicosService {
  constructor(
    @InjectRepository(Medico)
    private readonly medicoRepository: Repository<Medico>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @Inject("CACHE_MANAGER") private cacheManager: Cache
  ) {}

  async verificaUsuario(CreateUsuarioDto: CreateUsuarioDto) {
    try {
      const medicoCahce = await this.cacheManager.get<Usuario>(
        CreateUsuarioDto.email
      );
      if (medicoCahce) {
        throw new HttpException(
          {
            status: 400,
            message: "El usuario ya existe",
          },
          400
        );
      }

      const usuario = await this.usuarioRepository.findOne({
        where: {
          nombre: CreateUsuarioDto.nombre,
          apellido: CreateUsuarioDto.apellido,
          email: CreateUsuarioDto.email,
          rol: Roles.MEDICO,
        },
      });
      if (usuario) {
        throw new HttpException(
          {
            status: 400,
            message: "El usuario ya existe",
          },
          400
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: 400,
          message: error.message,
        },
        400
      );
    }
  }

  async create(
    CreateUsuarioDto: CreateUsuarioDto,
    createMedicoDto: CreateMedicoDto
  ): Promise<Medico> {
    try {
      await this.verificaUsuario(CreateUsuarioDto);
      if (CreateUsuarioDto.rol !== Roles.MEDICO) {
        throw new HttpException(
          {
            status: 400,
            message: "El usuario no es un medico",
          },
          400
        );
      }

      // password hasheado
      const salt = await bcrypt.genSalt(10);
      const hashedPAss = await bcrypt.hash(CreateUsuarioDto.contrasena, salt);

      const usuario = new Usuario();
      usuario.nombre = CreateUsuarioDto.nombre;
      usuario.apellido = CreateUsuarioDto.apellido;
      usuario.contrasena = hashedPAss;
      usuario.fecha_nacimiento = CreateUsuarioDto.fecha_nacimiento;
      usuario.genero = CreateUsuarioDto.genero;
      usuario.direccion = CreateUsuarioDto.direccion;
      usuario.telefonoCelular = CreateUsuarioDto.telefonoCelular;
      usuario.telefonoContacto = CreateUsuarioDto.telefonoContacto;
      usuario.email = CreateUsuarioDto.email;
      usuario.rol = Roles.MEDICO;
      await this.usuarioRepository.save(usuario);

      const medico = new Medico();
      medico.usuario = usuario;
      medico.horario_disponible = createMedicoDto.horario_disponible;
      medico.especialidad = createMedicoDto.especialidad;
      medico.fotoPerfil = "url_foto_perfil";
      medico.fechaContratacion = new Date();
      medico.activo = true;
      medico.certificaciones = createMedicoDto.certificaciones;
      return await this.medicoRepository.save(medico);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: 400,
          message: error.message,
        },
        400
      );
    }
  }

  async findAll(): Promise<PaginatedResult<Usuario>> {
    try {
      const [medicos, total] = await this.usuarioRepository.findAndCount({
        where: { rol: Roles.MEDICO },
        take: 10,
        order: { nombre: "ASC" },
      });
      const totalPages = Math.ceil(total / 10);
      return {
        data: medicos,
        meta: {
          total,
          page: 1,
          limit: 10,
          totalPages,
          hasNextPAge: true,
          hasPreviousPage: false,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: 400,
          message: error.message,
        },
        400
      );
    }
  }

  async update(
    medicoID: string,
    updateMedicoDto: UpdateMedicoDto
  ): Promise<any> {
    try {
      // Si no está en cache, verificamos directamente con preload
      const medicoUpdate = await this.medicoRepository.preload({
        id: medicoID,
        ...updateMedicoDto,
      });

      if (!medicoUpdate) {
        throw new HttpException(
          {
            status: 404,
            message: "El medico no existe",
          },
          404
        );
      }
      // guardo los cambios en la bd
      const medicoActualizado = await this.medicoRepository.save(medicoUpdate);

      // actualizo la cache del medico
      await this.cacheManager.set(medicoID, medicoActualizado);
      return {
        // status: 200,
        // mesagge: "Médico actualizado correctamente",
        data: medicoActualizado,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        {
          status: 400,
          message: error.message,
        },
        400
      );
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} medico`;
  }

  remove(id: number) {
    return `This action removes a #${id} medico`;
  }
}
