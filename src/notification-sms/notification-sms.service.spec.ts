import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSmsService } from './notification-sms.service';

describe('NotificationSmsService', () => {
  let service: NotificationSmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NotificationSmsService],
    }).compile();

    service = module.get<NotificationSmsService>(NotificationSmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
