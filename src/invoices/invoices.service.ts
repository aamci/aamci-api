import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class InvoicesService {
  constructor(private prisma: PrismaService) {}

  // Générer un numéro de facture unique
  private async generateInvoiceNumber(doctorId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.invoice.count({
      where: {
        doctorId,
        invoiceNumber: {
          startsWith: `FAC-${year}`,
        },
      },
    });
    const num = (count + 1).toString().padStart(4, '0');
    return `FAC-${year}-${num}`;
  }

  // Liste des factures pour un médecin
  async listForDoctor(doctorId: string, filters?: {
    status?: string;
    patientId?: string;
    appointmentId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { doctorId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.patientId) {
      where.patientId = filters.patientId;
    }

    if (filters?.appointmentId) {
      where.appointmentId = filters.appointmentId;
    }

    if (filters?.startDate || filters?.endDate) {
      where.issueDate = {};
      if (filters.startDate) {
        where.issueDate.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.issueDate.lte = new Date(filters.endDate);
      }
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Récupérer une facture par ID
  async findById(invoiceId: string, userId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            city: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            doctorProfile: {
              select: {
                specialty: true,
                address: true,
                city: true,
              },
            },
          },
        },
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    // Vérifier les droits d'accès
    if (invoice.doctorId !== userId && invoice.patientId !== userId) {
      throw new ForbiddenException('Accès non autorisé à cette facture');
    }

    return invoice;
  }

  // Créer une nouvelle facture
  async create(
    doctorId: string,
    dto: {
      patientId: string;
      appointmentId?: string;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      taxRate?: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    // Vérifier que le patient existe
    const patient = await this.prisma.user.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient non trouvé');
    }

    // Calculer les totaux
    let subtotal = 0;
    const itemsData = dto.items.map((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      subtotal += itemTotal;
      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Decimal(item.unitPrice),
        total: new Decimal(itemTotal),
      };
    });

    const taxRate = dto.taxRate ?? 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Générer le numéro de facture
    const invoiceNumber = await this.generateInvoiceNumber(doctorId);

    // Créer la facture avec ses items
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        doctorId,
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        status: 'DRAFT',
        items: {
          create: itemsData,
        },
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        items: true,
      },
    });

    return invoice;
  }

  // Mettre à jour une facture (brouillon uniquement)
  async update(
    invoiceId: string,
    doctorId: string,
    dto: {
      items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      taxRate?: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Seules les factures en brouillon peuvent être modifiées');
    }

    // Recalculer si les items changent
    let updateData: any = {};

    if (dto.items) {
      // Supprimer les anciens items
      await this.prisma.invoiceItem.deleteMany({
        where: { invoiceId },
      });

      // Calculer les nouveaux totaux
      let subtotal = 0;
      const itemsData = dto.items.map((item) => {
        const itemTotal = item.quantity * item.unitPrice;
        subtotal += itemTotal;
        return {
          description: item.description,
          quantity: item.quantity,
          unitPrice: new Decimal(item.unitPrice),
          total: new Decimal(itemTotal),
        };
      });

      const taxRate = dto.taxRate ?? Number(invoice.taxRate);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      updateData = {
        subtotal: new Decimal(subtotal),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(taxAmount),
        total: new Decimal(total),
        items: {
          create: itemsData,
        },
      };
    }

    if (dto.dueDate !== undefined) {
      updateData.dueDate = dto.dueDate ? new Date(dto.dueDate) : null;
    }

    if (dto.notes !== undefined) {
      updateData.notes = dto.notes;
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: updateData,
      include: {
        patient: true,
        items: true,
      },
    });
  }

  // Envoyer une facture au patient
  async send(invoiceId: string, doctorId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Cette facture a déjà été envoyée');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'SENT',
        issueDate: new Date(),
      },
    });
  }

  // Marquer comme payée
  async markAsPaid(
    invoiceId: string,
    doctorId: string,
    paymentMethod?: string,
  ) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Cette facture est déjà payée');
    }

    if (invoice.status === 'CANCELLED') {
      throw new BadRequestException('Cette facture a été annulée');
    }

    // Mettre à jour la facture
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paymentMethod,
      },
    });

    // Créditer le wallet du médecin
    const wallet = await this.prisma.wallet.upsert({
      where: { doctorId },
      create: {
        doctorId,
        balance: invoice.total,
      },
      update: {
        balance: {
          increment: invoice.total,
        },
      },
    });

    // Enregistrer le mouvement
    await this.prisma.walletMovement.create({
      data: {
        walletId: wallet.id,
        amount: invoice.total,
        type: 'CREDIT',
        description: `Paiement facture ${invoice.invoiceNumber}`,
      },
    });

    return updatedInvoice;
  }

  // Annuler une facture
  async cancel(invoiceId: string, doctorId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.doctorId !== doctorId) {
      throw new ForbiddenException('Accès non autorisé');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Une facture payée ne peut pas être annulée');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: 'CANCELLED' },
    });
  }

  // Statistiques de facturation pour un médecin
  async getStats(doctorId: string, period?: { startDate?: string; endDate?: string }) {
    const dateFilter: any = {};

    if (period?.startDate) {
      dateFilter.gte = new Date(period.startDate);
    }
    if (period?.endDate) {
      dateFilter.lte = new Date(period.endDate);
    }

    const where: any = { doctorId };
    if (Object.keys(dateFilter).length > 0) {
      where.issueDate = dateFilter;
    }

    // Agrégations par statut
    const [totalInvoices, paidInvoices, pendingInvoices, allInvoices] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: 'PAID' },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.aggregate({
        where: { ...where, status: { in: ['SENT', 'OVERDUE'] } },
        _sum: { total: true },
        _count: true,
      }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          patient: {
            select: { id: true, fullName: true },
          },
        },
      }),
    ]);

    // Wallet du médecin
    const wallet = await this.prisma.wallet.findUnique({
      where: { doctorId },
    });

    return {
      totalInvoices,
      paidCount: paidInvoices._count,
      paidAmount: paidInvoices._sum.total || 0,
      pendingCount: pendingInvoices._count,
      pendingAmount: pendingInvoices._sum.total || 0,
      walletBalance: wallet?.balance || 0,
      recentInvoices: allInvoices,
    };
  }
}
