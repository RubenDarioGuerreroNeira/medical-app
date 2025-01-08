// product.service.ts
@Injectable()
export class ProductService {
constructor(private readonly cloudinaryService: CloudinaryService) {}

async uploadProductImage(file: Express.Multer.File) {
return await this.cloudinaryService.uploadImage(file, 'products');
}
}

// user.service.ts
@Injectable()
export class UserService {
constructor(private readonly cloudinaryService: CloudinaryService) {}

async uploadProfilePicture(file: Express.Multer.File) {
return await this.cloudinaryService.uploadImage(file, 'users/profiles');
}
}

// banner.service.ts
@Injectable()
export class BannerService {
constructor(private readonly cloudinaryService: CloudinaryService) {}

async uploadBannerImage(file: Express.Multer.File) {
return await this.cloudinaryService.uploadImage(file, 'marketing/banners');
}
}
Copy
Insert

Ejemplos de estructura de carpetas que podrías usar:

products/ - Para imágenes de productos
products/thumbnails/
products/full/
users/ - Para imágenes relacionadas con usuarios
users/profiles/
users/documents/
marketing/ - Para imágenes de marketing
marketing/banners/
marketing/promotions/
Ventajas de usar folders:

Mejor organización de archivos
