import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import * as crypto from 'crypto';

export enum WebhookEvent {
  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_CANCELLED = 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  REVIEW_CREATED = 'REVIEW_CREATED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  PRESCRIPTION_CREATED = 'PRESCRIPTION_CREATED',
}

@Injectable()
export class WebhooksService {
  constructor(private prisma: PrismaService) {}

  async createSubscription(userId: string, createDto: CreateWebhookDto) {
    const secret = this.generateSecret();

    return this.prisma.webhookSubscription.create({
      data: {
        userId,
        url: createDto.url,
        secret,
        events: createDto.events,
        isActive: true,
      },
    });
  }

  async getSubscriptions(userId: string) {
    return this.prisma.webhookSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSubscription(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return subscription;
  }

  async updateSubscription(id: string, userId: string, updateDto: Partial<CreateWebhookDto>) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: updateDto,
    });
  }

  async deleteSubscription(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    await this.prisma.webhookSubscription.delete({ where: { id } });

    return { message: 'Webhook subscription deleted' };
  }

  async regenerateSecret(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    const newSecret = this.generateSecret();

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { secret: newSecret },
    });
  }

  async toggleActive(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return this.prisma.webhookSubscription.update({
      where: { id },
      data: { isActive: !subscription.isActive },
    });
  }

  // Trigger webhook for an event
  async triggerWebhook(event: WebhookEvent, userId: string, payload: any) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        userId,
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.deliverWebhook(sub, event, payload)),
    );

    return results;
  }

  // Trigger webhook for multiple users (e.g., both doctor and patient)
  async triggerWebhookForUsers(event: WebhookEvent, userIds: string[], payload: any) {
    const subscriptions = await this.prisma.webhookSubscription.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
        events: {
          has: event,
        },
      },
    });

    const results = await Promise.allSettled(
      subscriptions.map((sub) => this.deliverWebhook(sub, event, payload)),
    );

    return results;
  }

  private async deliverWebhook(
    subscription: { id: string; url: string; secret: string },
    event: string,
    payload: any,
  ) {
    const body = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload,
    });

    const signature = this.generateSignature(body, subscription.secret);

    // Create delivery record
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        subscriptionId: subscription.id,
        event,
        payload: body,
        status: 'PENDING',
      },
    });

    try {
      const response = await fetch(subscription.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
      });

      const responseBody = await response.text();

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: response.ok ? 'SUCCESS' : 'FAILED',
          statusCode: response.status,
          responseBody: responseBody.substring(0, 1000),
          deliveredAt: new Date(),
        },
      });

      // Update subscription stats
      await this.prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: response.ok
          ? {
              successCount: { increment: 1 },
              lastTriggeredAt: new Date(),
              lastSuccessAt: new Date(),
            }
          : {
              failureCount: { increment: 1 },
              lastTriggeredAt: new Date(),
              lastFailureAt: new Date(),
              lastError: responseBody.substring(0, 500),
            },
      });

      return { success: response.ok, statusCode: response.status };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.webhookDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'FAILED',
          errorMessage,
        },
      });

      await this.prisma.webhookSubscription.update({
        where: { id: subscription.id },
        data: {
          failureCount: { increment: 1 },
          lastTriggeredAt: new Date(),
          lastFailureAt: new Date(),
          lastError: errorMessage,
        },
      });

      throw error;
    }
  }

  async testWebhook(id: string, userId: string) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    return this.deliverWebhook(subscription, 'TEST', {
      message: 'This is a test webhook delivery',
      timestamp: new Date().toISOString(),
    });
  }

  async getDeliveryHistory(subscriptionId: string, userId: string, page = 1, limit = 20) {
    const subscription = await this.prisma.webhookSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      throw new NotFoundException('Webhook subscription not found');
    }

    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      this.prisma.webhookDelivery.findMany({
        where: { subscriptionId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webhookDelivery.count({ where: { subscriptionId } }),
    ]);

    return {
      deliveries,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  private generateSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }
}
