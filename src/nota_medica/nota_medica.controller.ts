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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CloudinaryService } from "../cloudinary/cloudinary.service";
import { NotaMedicaService } from "./nota_medica.service";
import { CreateNotaMedicaDto } from "./dto/create-nota_medica.dto";
import { UpdateNotaMedicaDto } from "./dto/update-nota_medica.dto";

@Controller("nota-medica")
export class NotaMedicaController {
  constructor(
    private readonly notaMedicaService: NotaMedicaService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post()
  create(@Body() createNotaMedicaDto: CreateNotaMedicaDto) {
    return this.notaMedicaService.create(createNotaMedicaDto);
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
        "notas-medicas"
      );

      // 2. Luego actualizamos la nota médica con la URL
      const notaActualizada = await this.notaMedicaService.updateImageUrl(
        id,
        uploadResult.secure_url
      );

      return {
        message: "Imagen subida y nota médica actualizada exitosamente",
        notaMedica: notaActualizada,
      };
    } catch (error) {
      throw new Error(`Error en el proceso: ${error.message}`);
    }
  }

  @Get()
  findAll() {
    return this.notaMedicaService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.notaMedicaService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateNotaMedicaDto: UpdateNotaMedicaDto
  ) {
    return this.notaMedicaService.update(+id, updateNotaMedicaDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.notaMedicaService.remove(+id);
  }
}
