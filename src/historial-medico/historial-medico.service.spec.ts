import { Test, TestingModule } from '@nestjs/testing';
import { HistorialMedicoService } from './historial-medico.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

describe('HistorialMedicoService', () => {
  let service: HistorialMedicoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HistorialMedicoService,
        {
          provide: CACHE_MANAGER,
          useValue: {}, // Mock del CACHE_MANAGER
        },
        {
          provide: 'HistorialMedicoRepository',
          useValue: {}, // Mock del repositorio
        },
        {
          provide: 'UsuarioRepository',
          useValue: {}, // Mock del repositorio
        },
        {
          provide: 'MedicoRepository',
          useValue: {}, // Mock del repositorio
        },
      ],
    }).compile();

    service = module.get<HistorialMedicoService>(HistorialMedicoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
