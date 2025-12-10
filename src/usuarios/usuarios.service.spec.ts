import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';

describe('UsuariosService', () => {
  let service: UsuariosService;

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

    service = module.get<UsuariosService>(UsuariosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
