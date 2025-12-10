import { Test, TestingModule } from '@nestjs/testing';
import { NotaMedicaController } from './nota_medica.controller';
import { NotaMedicaService } from './nota_medica.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotaMedica } from '../Entities/NotaMedica.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('NotaMedicaController', () => {
  let controller: NotaMedicaController;

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotaMedicaController],
      providers: [
        NotaMedicaService,
        {
          provide: getRepositoryToken(NotaMedica),
          useValue: mockRepository,
        },
        {
          provide: CloudinaryService,
          useValue: { uploadImage: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<NotaMedicaController>(NotaMedicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
