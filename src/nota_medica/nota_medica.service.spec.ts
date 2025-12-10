import { Test, TestingModule } from '@nestjs/testing';
import { NotaMedicaService } from './nota_medica.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotaMedica } from '../Entities/NotaMedica.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

describe('NotaMedicaService', () => {
  let service: NotaMedicaService;

  const mockRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn(),
    deleteImage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotaMedicaService,
        {
          provide: getRepositoryToken(NotaMedica),
          useValue: mockRepository,
        },
        {
          provide: CloudinaryService,
          useValue: mockCloudinaryService,
        },
      ],
    }).compile();

    service = module.get<NotaMedicaService>(NotaMedicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
