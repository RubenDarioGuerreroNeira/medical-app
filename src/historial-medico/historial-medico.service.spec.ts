import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoService } from './historial-medico.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistorialMedico } from '../Entities/HistorialMedico.entity';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';
import { DataSource } from 'typeorm';

describe('HistorialMedicoService', () => {
  let service: HistorialMedicoService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistorialMedicoService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: getRepositoryToken(HistorialMedico),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Medico),
          useValue: mockRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<HistorialMedicoService>(HistorialMedicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
