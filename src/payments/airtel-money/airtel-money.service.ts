// apps/api/src/payments/airtel.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import fetch from 'node-fetch';

@Injectable()
export class AirtelMoneyService {
  constructor(private prisma: PrismaService) {}

  private get baseUrl() {
    return process.env.AIRTEL_MONEY_BASE_URL!;
  }
  private get clientId() {
    return process.env.AIRTEL_MONEY_CLIENT_ID!;
  }
  private get clientSecret() {
    return process.env.AIRTEL_MONEY_CLIENT_SECRET!;
  }

  private async getAccessToken(): Promise<string> {
    // dépend du provider ; souvent OAuth2 client_credentials
    const res = await fetch(`${this.baseUrl}/auth/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });
    const data = await res.json();
    return data.access_token;
  }

  async initPayment(params: {
    doctorId: string;
    patientId: string;
    phoneNumber: string;
    amount: number; // en unité monétaire
    currency: string;
  }) {
    const token = await this.getAccessToken();

    // 1) Crée une transaction en PENDING dans ta DB
    const tx = await this.prisma.transaction.create({
      data: {
        doctorId: params.doctorId,
        amount: params.amount,
        patientId: params.patientId,
        type: 'PAYMENT',
        status: 'PENDING',
        provider: 'AIRTEL_MONEY',
      },
    });

    // 2) Appelle Airtel pour initier le paiement
    const res = await fetch(`${this.baseUrl}/merchant/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-Country': process.env.AIRTEL_COUNTRY || 'FR',
        'X-Currency': params.currency,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: tx.id, // pour retrouver dans le webhook
        subscriber: {
          country: process.env.AIRTEL_COUNTRY || 'FR',
          currency: params.currency,
          msisdn: params.phoneNumber,
        },
        transaction: {
          amount: params.amount.toFixed(2),
          country: process.env.AIRTEL_COUNTRY || 'FR',
          currency: params.currency,
        },
        // callback_url: `${process.env.API_BASE_URL}/payments/airtel/webhook`
      }),
    });

    const data = await res.json();

    // Airtel renvoie en général un `transactionId` / `airtelReference`
    const airtelRef = data?.data?.transaction?.id || data?.transactionId;

    await this.prisma.transaction.update({
      where: { id: tx.id },
      data: { providerRef: airtelRef },
    });

    return {
      transactionId: tx.id,
      airtelRef,
      status: tx.status,
      // parfois Airtel renvoie un "payment URL" ou on laisse le client
      // valider par USSD/popup sur son téléphone.
    };
  }

  async handleWebhook(payload: any) {
    // dépend énormément de la spec Airtel
    const reference = payload?.data?.reference; // notre tx.id
    const status = payload?.data?.status;       // "SUCCESS" | "FAILED"...

    if (!reference) return;

    if (status === 'SUCCESS') {
      await this.prisma.transaction.update({
        where: { id: reference },
        data: { status: 'SUCCESS' },
      });
    } else if (status === 'FAILED') {
      await this.prisma.transaction.update({
        where: { id: reference },
        data: { status: 'FAILED' },
      });
    }

    return { ok: true };
  }
}