import { Test, TestingModule } from '@nestjs/testing';
import { RecetaMedicaService } from './receta-medica.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecetaMedica } from '../Entities/RecetaMedica.entity';
import { Cita } from '../Entities/Cita.entity';

describe('RecetaMedicaService', () => {
  let service: RecetaMedicaService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    merge: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecetaMedicaService,
        {
          provide: getRepositoryToken(RecetaMedica),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Cita),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RecetaMedicaService>(RecetaMedicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
