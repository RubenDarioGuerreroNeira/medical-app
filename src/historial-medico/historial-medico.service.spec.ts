import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoService } from './historial-medico.service';

describe('HistorialMedicoService', () => {
  let service: HistorialMedicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HistorialMedicoService],
    }).compile();

    service = module.get<HistorialMedicoService>(HistorialMedicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
