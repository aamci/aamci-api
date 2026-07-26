import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null;

  constructor() {
    const apiKey  = process.env.AFRICASTALKING_API_KEY;
    const username = process.env.AFRICASTALKING_USERNAME;

    if (apiKey && username) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AfricasTalking = require('africastalking');
        const at = AfricasTalking({ apiKey, username });
        this.client = at.SMS;
        this.logger.log('Africa\'s Talking SMS service initialized');
      } catch (e) {
        this.logger.warn('Failed to initialize Africa\'s Talking SDK:', e);
      }
    } else {
      this.logger.warn('AFRICASTALKING_API_KEY / AFRICASTALKING_USERNAME not set — SMS disabled');
    }
  }

  async send(to: string, message: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn(`SMS not sent (service disabled): ${to} — ${message.substring(0, 50)}`);
      return false;
    }

    // Normalize to international format for Gabon (+241)
    const normalized = this.normalizePhone(to);
    if (!normalized) {
      this.logger.warn(`Invalid phone number: ${to}`);
      return false;
    }

    try {
      const result = await this.client.send({
        to: [normalized],
        message,
        from: process.env.AFRICASTALKING_SENDER_ID || 'IBOGHA',
      });
      this.logger.log(`SMS sent to ${normalized}: ${JSON.stringify(result.SMSMessageData?.Recipients)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${normalized}:`, error);
      return false;
    }
  }

  private normalizePhone(phone: string): string | null {
    const cleaned = phone.replace(/\s|-|\(|\)/g, '');
    if (cleaned.startsWith('+')) return cleaned;
    // Gabon numbers: 07XXXXXXXX → +24107XXXXXXXX, or 06XXXXXXXX → +24106XXXXXXXX
    if (/^(06|07|011)[0-9]{7,8}$/.test(cleaned)) return `+241${cleaned}`;
    if (/^241[0-9]{8,9}$/.test(cleaned)) return `+${cleaned}`;
    return null;
  }
}
