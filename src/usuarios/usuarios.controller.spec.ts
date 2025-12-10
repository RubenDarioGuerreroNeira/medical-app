import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';

describe('UsuariosController', () => {
  let controller: UsuariosController;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        UsuariosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Medico),
          useValue: mockRepository,
        },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
