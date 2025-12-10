import { Test, TestingModule } from '@nestjs/testing';
import { MedicosService } from './medicos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Medico } from '../Entities/Medico.entity';
import { Usuario } from '../Entities/Usuarios.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('MedicosService', () => {
  let service: MedicosService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    preload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MedicosService,
        {
          provide: getRepositoryToken(Medico),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockRepository,
        },
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<MedicosService>(MedicosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
