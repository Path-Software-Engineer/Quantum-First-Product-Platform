import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health/live')
  live(): { status: 'ok'; service: 'control-api' } {
    return this.appService.live();
  }

  @Get('health/ready')
  async ready(): Promise<{ status: 'ok'; database: 'connected' }> {
    try {
      return await this.appService.ready();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
