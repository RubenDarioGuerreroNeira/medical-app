import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoController } from './historial-medico.controller';
import { HistorialMedicoService } from './historial-medico.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HistorialMedico } from '../Entities/HistorialMedico.entity';
import { Usuario } from '../Entities/Usuarios.entity';
import { Medico } from '../Entities/Medico.entity';
import { DataSource } from 'typeorm';

describe('HistorialMedicoController', () => {
  let controller: HistorialMedicoController;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HistorialMedicoController],
      providers: [
        HistorialMedicoService,
        {
          provide: CACHE_MANAGER,
          useValue: { get: jest.fn(), set: jest.fn() },
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
          useValue: { createQueryRunner: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<HistorialMedicoController>(HistorialMedicoController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
