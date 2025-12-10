import { Test, TestingModule } from '@nestjs/testing';
import { RecetaMedicaController } from './receta-medica.controller';
import { RecetaMedicaService } from './receta-medica.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecetaMedica } from '../Entities/RecetaMedica.entity';
import { Cita } from '../Entities/Cita.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('RecetaMedicaController', () => {
  let controller: RecetaMedicaController;

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
      controllers: [RecetaMedicaController],
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
        {
          provide: CloudinaryService,
          useValue: { uploadImage: jest.fn(), deleteImage: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<RecetaMedicaController>(RecetaMedicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
