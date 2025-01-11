import { Test, TestingModule } from '@nestjs/testing';
import { RecetaMedicaService } from './receta-medica.service';

describe('RecetaMedicaService', () => {
  let service: RecetaMedicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecetaMedicaService],
    }).compile();

    service = module.get<RecetaMedicaService>(RecetaMedicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
