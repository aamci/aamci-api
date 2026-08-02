// apps/api/src/payments/payments.controller.ts
import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
  Headers,
  RawBodyRequest,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AirtelMoneyService } from './airtel-money/airtel-money.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService, private readonly airtel: AirtelMoneyService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(@Req() req, @Body() body: any) {
    const user = req.user;
    const { doctorId, amountCents, currency } = body;

    const session = await this.payments.createDoctorCheckoutSession({
      doctorId,
      patientId: user.userId,
      amountCents,
      currency: currency || 'eur',
      successUrl: process.env.PAYMENT_SUCCESS_URL!,
      cancelUrl: process.env.PAYMENT_CANCEL_URL!,
    });

    return { url: session.url, id: session.id };
  }

  // Stripe webhook : attention au RawBody dans main.ts
  @Post('stripe/webhook')
  async stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res,
    @Headers('stripe-signature') sig?: string,
  ) {
    try {
      await this.payments.handleStripeWebhook(
        // @ts-ignore
        req.rawBody as Buffer,
        sig,
      );
      return res.status(200).json({ received: true });
    } catch (err: any) {
      console.error('Stripe webhook error', err.message);
      return res.status(400).json({ error: err.message });
    }
  }

    @Post('airtel/webhook')
  async webhook(@Body() payload: any) {
    await this.airtel.handleWebhook(payload);
    return { received: true };
  }

  // ── Pré-paiement ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('prepay/:appointmentId/create-intent')
  async createPrepayIntent(
    @Param('appointmentId') appointmentId: string,
    @Req() req,
  ) {
    return this.payments.createPrepayIntent(appointmentId, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('prepay/:appointmentId/confirm')
  async confirmPrepayment(
    @Param('appointmentId') appointmentId: string,
    @Body() body: { paymentIntentId: string },
  ) {
    return this.payments.confirmPrepayment(body.paymentIntentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('prepay/:appointmentId/refund')
  async refundPrepayment(
    @Param('appointmentId') appointmentId: string,
    @Req() req,
  ) {
    return this.payments.refundPrepayment(appointmentId, req.user.userId);
  }
}