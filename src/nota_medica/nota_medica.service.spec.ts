import { Test, TestingModule } from '@nestjs/testing';
import { NotaMedicaService } from './nota_medica.service';

describe('NotaMedicaService', () => {
  let service: NotaMedicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotaMedicaService],
    }).compile();

    service = module.get<NotaMedicaService>(NotaMedicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
