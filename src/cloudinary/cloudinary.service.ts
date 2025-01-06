import { Injectable } from "@nestjs/common";
import { UploadApiErrorResponse, UploadApiResponse, v2 } from "cloudinary";
import { HttpException, HttpStatus } from "@nestjs/common";

@Injectable()
export class CloudinaryService {
  async uploadImage(
    file: Express.Multer.File,
    folder?: string // organiza las imagenes
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    try {
      if (!file)
        throw new HttpException(
          "No se encontro el archivo",
          HttpStatus.BAD_REQUEST
        );

      return new Promise((resolve, reject) => {
        v2.uploader
          .upload_stream(
            {
              resource_type: "auto",
              folder: folder || "images",
              format: "webp",
              quality: "auto",
              transformation: [
                {
                  width: 1000,
                  height: 1000,
                  crop: "limit",
                },
              ],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          )
          .end(file.buffer);
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: error.message,
          error: "Error al subir la imagen",
        },
        HttpStatus.BAD_REQUEST
      );
    }
  }
}
