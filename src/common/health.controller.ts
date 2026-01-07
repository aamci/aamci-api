import { Controller, Get } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: DatabaseHealthService) {}

  @Get()
  async check() {
    return this.healthService.getHealthStatus();
  }

  @Get('database')
  async checkDatabase() {
    const status = await this.healthService.getHealthStatus();
    return {
      database: status.database,
      timestamp: status.timestamp,
    };
  }
}
