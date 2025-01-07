import { Test, TestingModule } from '@nestjs/testing';
import { NotaMedicaController } from './nota_medica.controller';
import { NotaMedicaService } from './nota_medica.service';

describe('NotaMedicaController', () => {
  let controller: NotaMedicaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotaMedicaController],
      providers: [NotaMedicaService],
    }).compile();

    controller = module.get<NotaMedicaController>(NotaMedicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
