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
}