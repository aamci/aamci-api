// apps/api/src/payments/payments.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-10-29.clover', // ex : adapte à la version choisie
    });
  }

  async createDoctorCheckoutSession(params: {
    doctorId: string;
    patientId: string;
    amountCents: number;
    currency: string;
    successUrl: string;
    cancelUrl: string;
  }) {
    const { doctorId, patientId, amountCents, currency, successUrl, cancelUrl } =
      params;

    if (amountCents <= 0) {
      throw new BadRequestException('Montant invalide');
    }

    // 1) Crée un enregistrement "pending" côté DB
    const tx = await this.prisma.transaction.create({
      data: {
        doctorId,
        patientId,
        amount: amountCents / 100,
        type: 'PAYMENT',
        status: 'PENDING',
        provider: 'STRIPE',
      },
    });

    // 2) Crée la session Stripe
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      currency,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Consultation médicale',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        app_transaction_id: tx.id,
        doctor_id: doctorId,
        patient_id: patientId,
      },
    });

    // 3) Sauvegarde la ref Stripe
    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: {
        providerRef: session.id,
      },
    });

    return session;
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret || !signature) throw new BadRequestException('Missing signature');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (err: any) {
      throw new BadRequestException(`Webhook signature error: ${err.message}`);
    }

    // On gère les évènements qui nous intéressent
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const txId = session.metadata?.app_transaction_id;

      if (!txId) return;

      await this.prisma.transaction.update({
        where: { id: txId },
        data: { status: 'SUCCESS' },
      });

      // ici tu peux:
      // - créditer le wallet du docteur (si tu as une table Wallet, sinon agrégations)
      // - marquer un rendez-vous "PAYÉ"
    }

    if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object as any;
      await this.confirmPrepayment(pi.id).catch(() => {});
    }

    if (event.type === 'checkout.session.expired' || event.type === 'checkout.session.async_payment_failed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const txId = session.metadata?.app_transaction_id;
      if (!txId) return;
      await this.prisma.transaction.update({
        where: { id: txId },
        data: { status: 'FAILED' },
      });
    }

    return { received: true };
  }

  // ── Pré-paiement à la réservation ─────────────────────────────────────────

  async createPrepayIntent(appointmentId: string, patientId: string) {
    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        kind: true,
        slot: true,
        patient: true,
      },
    });
    if (!appt) throw new BadRequestException('Rendez-vous introuvable');
    if (appt.patientId !== patientId) throw new BadRequestException('Accès refusé');

    const kind = appt.kind as any;
    if (!kind?.requiresPrePayment) throw new BadRequestException('Ce type de consultation ne nécessite pas de pré-paiement');

    // XAF is a zero-decimal currency in Stripe (no cents multiplication)
    const amount = Math.round(Number(kind.price ?? 5000));

    const intent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'xaf',
      payment_method_types: ['card'],
      metadata: {
        appointment_id: appointmentId,
        patient_id: patientId,
        kind_id: kind.id,
      },
    });

    // Mark appointment as prepayment pending
    await (this.prisma as any).appointment.update({
      where: { id: appointmentId },
      data: {
        prepaidPaymentIntentId: intent.id,
        prepaidStatus: 'PENDING',
        prepaidAmount: amount,
      },
    });

    return { clientSecret: intent.client_secret, amount, currency: 'xaf' };
  }

  async confirmPrepayment(paymentIntentId: string) {
    const appt = await (this.prisma as any).appointment.findFirst({
      where: { prepaidPaymentIntentId: paymentIntentId },
      include: { slot: true },
    });
    if (!appt) return { ok: true };

    await (this.prisma as any).appointment.update({
      where: { id: appt.id },
      data: { prepaidStatus: 'PAID' },
    });

    await this.prisma.transaction.create({
      data: {
        doctorId: appt.slot?.ownerId ?? appt.doctorId ?? 'unknown',
        patientId: appt.patientId,
        appointmentId: appt.id,
        amount: appt.prepaidAmount ?? 0,
        type: 'PAYMENT',
        status: 'SUCCESS',
        provider: 'STRIPE',
        providerRef: paymentIntentId,
        description: 'Pré-paiement consultation',
      },
    });

    return { ok: true };
  }

  async refundPrepayment(appointmentId: string, doctorId: string) {
    const appt = await (this.prisma as any).appointment.findUnique({
      where: { id: appointmentId },
      include: { slot: true },
    });
    if (!appt) throw new BadRequestException('Rendez-vous introuvable');
    if (appt.slot?.ownerId !== doctorId) throw new BadRequestException('Accès refusé');
    if (appt.prepaidStatus !== 'PAID') throw new BadRequestException('Paiement non effectué');

    await this.stripe.refunds.create({ payment_intent: appt.prepaidPaymentIntentId });

    await (this.prisma as any).appointment.update({
      where: { id: appointmentId },
      data: { prepaidStatus: 'REFUNDED', prepaidRefundedAt: new Date() },
    });

    return { success: true };
  }
}