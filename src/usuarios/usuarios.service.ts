import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { Usuario } from '../Entities/Usuarios.entity';
import { Roles } from '../Entities/Usuarios.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()

export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private usuarioRepository:Repository <Usuario>) {}
  
  
    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
      return await bcrypt.compare(plainPassword, hashedPassword);
    }
  
  
    async create(createUsuarioDto: CreateUsuarioDto):Promise<Usuario> {
    
    const bUsuario = await this.usuarioRepository.findOneBy({
      email: createUsuarioDto.email,
    });

    if (bUsuario) {
      throw new Error('Usuario ya existente');
    } 
    
    try {
     
     const salt=await bcrypt.genSalt(10)
     const hashedPAss=await bcrypt.hash(createUsuarioDto.contrasena,salt)
     
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

      return await this.usuarioRepository.save(usuario);
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  findAll() {
    return `This action returns all usuarios`;
  }

  findOne(usuarioId: string) {
    try{
      const bUsuario= this.usuarioRepository.findOneBy({id:usuarioId});
      if(!bUsuario){
        throw new Error('Usuario no encontrado');
      }
      return bUsuario;
    }catch(error){
      throw new BadRequestException(error.message);
    }
  }

  update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return `This action updates a #${id} usuario`;
  }

  remove(id: number) {
    return `This action removes a #${id} usuario`;
  }
}
