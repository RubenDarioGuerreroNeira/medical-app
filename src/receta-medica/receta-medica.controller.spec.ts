import { Test, TestingModule } from '@nestjs/testing';
import { RecetaMedicaController } from './receta-medica.controller';
import { RecetaMedicaService } from './receta-medica.service';

describe('RecetaMedicaController', () => {
  let controller: RecetaMedicaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecetaMedicaController],
      providers: [RecetaMedicaService],
    }).compile();

    controller = module.get<RecetaMedicaController>(RecetaMedicaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
