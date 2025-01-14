import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  HttpStatus,
  HttpException,
  BadRequestException,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { RecetaMedicaService } from "./receta-medica.service";
import { CreateRecetaMedicaDto } from "./dto/create-receta-medica.dto";
import { UpdateRecetaMedicaDto } from "./dto/update-receta-medica.dto";
import { NotFoundError } from "rxjs";
import { FileInterceptor } from "@nestjs/platform-express";
import { CloudinaryService } from "src/cloudinary/cloudinary.service";
import { RecetaMedica } from "src/Entities/RecetaMedica";

interface RecetaMedicaResponse {
  status: number;
  message: string;
  data: RecetaMedica;
}

@Controller("receta-medica")
export class RecetaMedicaController {
  constructor(
    private readonly recetaMedicaService: RecetaMedicaService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  async create(@Body() createRecetaMedicaDto: CreateRecetaMedicaDto) {
    try {
      // return this.recetaMedicaService.create(createRecetaMedicaDto);
      const receta = await this.recetaMedicaService.create(
        createRecetaMedicaDto
      );
      return {
        status: HttpStatus.CREATED,
        message: "Receta médica creada exitosamente",
        data: receta,
      };
    } catch (error) {
      throw new NotFoundException(error.message);
    }
  }

  @Post("upload-imagen/:id")
  @UseInterceptors(FileInterceptor("file"))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Param("id") id: string
  ) {
    try {
      // 1. Primero subimos la imagen a Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(
        file,
        "recetas-medicas" // carpeta en Cloudinary
      );
      // 2. Luego actualizamos la receta médica con la URL
      const recetaActualizada = await this.recetaMedicaService.updateImageUrl(
        id,
        uploadResult.secure_url
      );
      // return recetaActualizada;

      return {
        status: HttpStatus.OK,
        message: "Imagen subida y receta médica actualizada exitosamente",
        recetaMedica: recetaActualizada,
      };
    } catch (error) {
      throw new Error(`Error en el proceso: ${error.message}`);
    }
  }

  @Get()
  async findAll(@Query("page") page = 1, @Query("limit") limit = 5) {
    try {
      // Convertir page y limit a números
      const pageNumber = parseInt(page.toString());
      const limitNumber = parseInt(limit.toString());

      // Obtener los datos del servicio
      const { recetas, total } = await this.recetaMedicaService.findAll(
        pageNumber,
        limitNumber
      );

      return {
        status: HttpStatus.OK,
        data: recetas,
        meta: {
          total,
          page: pageNumber,
          limit: limitNumber,
          totalPages: Math.ceil(total / limitNumber),
          hasNextPage: pageNumber * limitNumber < total,
          hasPreviousPage: pageNumber > 1,
        },
      };
    } catch (error) {
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message || "Error al obtener las recetas médicas",
      });
    }
  }

  @Get("findone/:id")
  async findOne(@Param("id") id: string): Promise<RecetaMedicaResponse> {
    try {
      const receta = await this.recetaMedicaService.findOne(id);
      return {
        status: HttpStatus.OK,
        message: "Receta médica obtenida exitosamente",
        data: receta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message || "Error al obtener la receta médica",
      });
    }
  }

  @Patch("update/:id")
  async update(
    @Param("id") id: string,
    @Body() updateRecetaMedicaDto: UpdateRecetaMedicaDto
  ) {
    try {
      const receta = await this.recetaMedicaService.update(
        id,
        updateRecetaMedicaDto
      );
      return {
        status: HttpStatus.OK,
        message: "Receta médica actualizada exitosamente",
        data: receta,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message || "Error al actualizar la receta médica",
      });
    }
  }

  @Delete("delete/:id")
  async remove(@Param("id") id: string) {
    try {
      const receta = await this.recetaMedicaService.remove(id);
      return {
        status: HttpStatus.OK,
        message: "Receta Médica eliminada",
        data: receta,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new BadRequestException({
        status: HttpStatus.BAD_REQUEST,
        message: error.message || "Error al eliminar la receta médica",
      });
    }
  }
}
