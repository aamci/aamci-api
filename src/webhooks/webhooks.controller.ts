import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('webhooks')
@UseGuards(JwtAuthGuard)
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  create(@Request() req, @Body() createDto: CreateWebhookDto) {
    return this.webhooksService.createSubscription(req.user.sub, createDto);
  }

  @Get()
  findAll(@Request() req) {
    return this.webhooksService.getSubscriptions(req.user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.webhooksService.getSubscription(id, req.user.sub);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: Partial<CreateWebhookDto>,
  ) {
    return this.webhooksService.updateSubscription(id, req.user.sub, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.webhooksService.deleteSubscription(id, req.user.sub);
  }

  @Post(':id/regenerate-secret')
  regenerateSecret(@Param('id') id: string, @Request() req) {
    return this.webhooksService.regenerateSecret(id, req.user.sub);
  }

  @Post(':id/toggle')
  toggle(@Param('id') id: string, @Request() req) {
    return this.webhooksService.toggleActive(id, req.user.sub);
  }

  @Post(':id/test')
  test(@Param('id') id: string, @Request() req) {
    return this.webhooksService.testWebhook(id, req.user.sub);
  }

  @Get(':id/deliveries')
  getDeliveries(
    @Param('id') id: string,
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.webhooksService.getDeliveryHistory(
      id,
      req.user.sub,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
