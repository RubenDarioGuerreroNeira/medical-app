import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSmsController } from './notification-sms.controller';
import { NotificationSmsService } from './notification-sms.service';

describe('NotificationSmsController', () => {
  let controller: NotificationSmsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationSmsController],
      providers: [NotificationSmsService],
    }).compile();

    controller = module.get<NotificationSmsController>(NotificationSmsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
