export class CreateUsuarioDto {
    id?:string;
    nombre: string;
    apellido: string;
    fecha_nacimiento: Date;
    genero: string;
    direccion: string;
    telefonoCelular: string;
    telefonoContacto: string;
    email: string;
    contrasena: string;
    rol: string;    
}
