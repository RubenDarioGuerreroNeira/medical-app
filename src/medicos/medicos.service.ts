import { HttpException, Injectable } from "@nestjs/common";
import { CreateMedicoDto } from "./dto/create-medico.dto";
import { UpdateMedicoDto } from "./dto/update-medico.dto";
import { Medico } from "src/Entities/Medico.entity";
import { Usuario, Roles } from "src/Entities/Usuarios.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Cache } from "cache-manager";
import { Inject } from "@nestjs/common";
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

  findOne(id: number) {
    return `This action returns a #${id} medico`;
  }

  update(id: number, updateMedicoDto: UpdateMedicoDto) {
    return `This action updates a #${id} medico`;
  }

  remove(id: number) {
    return `This action removes a #${id} medico`;
  }
}
