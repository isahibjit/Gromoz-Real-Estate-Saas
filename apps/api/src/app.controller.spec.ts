import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  const appServiceMock = {
    getHello: jest.fn().mockReturnValue('Hello World!'),
    getRootHealth: jest.fn().mockResolvedValue({
      message: 'Truroot CRM API is healthy',
      service: 'truroot-crm-api',
      status: 'ok',
      timestamp: '2026-06-03T00:00:00.000Z',
      uptimeSeconds: 1,
      checks: {
        database: {
          status: 'up',
          latencyMs: 10,
        },
      },
    }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: appServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return a root health response', async () => {
      await expect(appController.getRootHealth()).resolves.toEqual(
        expect.objectContaining({
          message: 'Truroot CRM API is healthy',
          service: 'truroot-crm-api',
          status: 'ok',
        }),
      );
    });
  });

  describe('hello', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toEqual('Hello World!');
    });
  });
});
