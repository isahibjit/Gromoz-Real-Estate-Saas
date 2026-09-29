import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  AppService,
  type BaseHealthResponse,
  type ReadinessHealthResponse,
  type RootHealthResponse,
} from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async getRootHealth(): Promise<RootHealthResponse> {
    return await this.appService.getRootHealth();
  }

  @Get('hello')
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth(): Promise<RootHealthResponse> {
    return await this.appService.getRootHealth();
  }

  @Get('health/live')
  async getLiveness(): Promise<BaseHealthResponse> {
    return await this.appService.getLiveness();
  }

  @Get('health/ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReadinessHealthResponse> {
    const readiness = await this.appService.getReadiness();

    if (readiness.status !== 'ok') {
      response.status(HttpStatus.SERVICE_UNAVAILABLE);
    }

    return readiness;
  }
}
