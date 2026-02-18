import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SetGoalsDto, GetAnalyticsQueryDto } from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboardMetrics(
    @Request() req,
    @Query('period') period: '7d' | '30d' | '90d' | '12m' = '30d',
  ) {
    return this.analyticsService.getDashboardMetrics(req.user.userId, period);
  }

  @Get('advanced')
  getAdvancedMetrics(@Request() req) {
    return this.analyticsService.getAdvancedMetrics(req.user.userId);
  }

  @Get('retention')
  getRetentionMetrics(@Request() req) {
    return this.analyticsService.getRetentionMetrics(req.user.userId);
  }

  @Get('goals')
  getGoals(@Request() req, @Query() query: GetAnalyticsQueryDto) {
    const now = new Date();
    const year = query.year || now.getFullYear();
    const month = query.month || now.getMonth() + 1;
    return this.analyticsService.getGoals(req.user.userId, year, month);
  }

  @Post('goals')
  setGoals(
    @Request() req,
    @Query() query: GetAnalyticsQueryDto,
    @Body() goals: SetGoalsDto,
  ) {
    const now = new Date();
    const year = query.year || now.getFullYear();
    const month = query.month || now.getMonth() + 1;
    return this.analyticsService.setGoals(req.user.userId, year, month, goals);
  }

  @Get('trends')
  getMonthlyTrends(@Request() req) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    return this.analyticsService.getMonthlyTrends(req.user.userId, sixMonthsAgo, now);
  }

  @Get('top-services')
  getTopServices(@Request() req) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.analyticsService.getTopServices(req.user.userId, monthStart, now);
  }

  @Get('performance-by-day')
  getPerformanceByDay(@Request() req) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return this.analyticsService.getPerformanceByDay(req.user.userId, monthStart, now);
  }
}
