import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SlotsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 🌍 Génère les créneaux disponibles à partir des AvailabilityRules
   * Utilisé par le patient pour voir le calendrier du médecin
   */
  async generateAvailableSlots(doctorId: string, from?: Date, to?: Date) {
    const now = new Date();
    const rangeStart = from && from > now ? from : now;
    const rangeEnd = to || new Date(now.getTime() + 5 * 7 * 24 * 60 * 60 * 1000); // 5 semaines

    // 1. Récupérer les règles actives du médecin
    const rules = await this.prisma.availabilityRule.findMany({
      where: {
        ownerId: doctorId,
        status: 'ACTIVE',
        endDate: { gte: rangeStart },
        startDate: { lte: rangeEnd },
      },
    });

    if (rules.length === 0) return [];

    // 2. Récupérer les absences qui bloquent les créneaux
    const absences = await this.prisma.doctorAbsence.findMany({
      where: {
        doctorId,
        blockSlots: true,
        endDate: { gte: rangeStart },
        startDate: { lte: rangeEnd },
      },
    });

    // 3. Récupérer les rendez-vous existants (non annulés) pour filtrer
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        status: { not: 'CANCELLED' },
        slot: {
          ownerId: doctorId,
          start: { gte: rangeStart },
          end: { lte: rangeEnd },
        },
      },
      include: { slot: true },
    });

    // Créer un set des heures de début déjà réservées
    const bookedTimes = new Set(
      existingAppointments.map((a) => new Date(a.slot.start).toISOString()),
    );

    // 4. Générer les créneaux à partir des règles
    const slots: any[] = [];

    for (const rule of rules) {
      const ruleStart = new Date(rule.startDate);
      const ruleEnd = new Date(rule.endDate);

      const effectiveStart = new Date(Math.max(rangeStart.getTime(), ruleStart.getTime()));
      effectiveStart.setHours(0, 0, 0, 0);
      const effectiveEnd = new Date(Math.min(rangeEnd.getTime(), ruleEnd.getTime()));

      const currentDate = new Date(effectiveStart);

      while (currentDate <= effectiveEnd) {
        const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

        // Vérifier si ce jour est dans les jours actifs de la règle
        if (rule.daysOfWeek.includes(dayOfWeek)) {
          // Vérifier les absences
          const isDuringAbsence = absences.some((a) => {
            const absStart = new Date(a.startDate);
            absStart.setHours(0, 0, 0, 0);
            const absEnd = new Date(a.endDate);
            absEnd.setHours(23, 59, 59, 999);
            return currentDate >= absStart && currentDate <= absEnd;
          });

          if (!isDuringAbsence) {
            for (let h = rule.startHour; h < rule.endHour; h++) {
              for (let m = 0; m < 60; m += rule.slotDurationMins) {
                const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

                // Vérifier les heures exclues
                const isExcluded = (rule.excludedTimes || []).some((range) => {
                  const [start, end] = range.split('-');
                  return timeStr >= start && timeStr < end;
                });

                if (isExcluded) continue;

                const slotStart = new Date(currentDate);
                slotStart.setHours(h, m, 0, 0);

                // Ignorer les créneaux dans le passé
                if (slotStart <= now) continue;

                const slotEnd = new Date(slotStart.getTime() + rule.slotDurationMins * 60000);

                // Vérifier si ce créneau est déjà réservé
                if (bookedTimes.has(slotStart.toISOString())) continue;

                slots.push({
                  id: `rule-${rule.id}-${slotStart.toISOString()}`,
                  start: slotStart.toISOString(),
                  end: slotEnd.toISOString(),
                  capacity: rule.capacity,
                  status: 'ACTIVE',
                  ownerId: doctorId,
                  ruleId: rule.id,
                });
              }
            }
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    // Trier par date
    slots.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return slots;
  }

  /**
   * 🔒 Pour le doctor connecté (vue interne)
   * Renvoie UNIQUEMENT ses créneaux avec rendez-vous (slots réservés)
   */
  async findAllByOwner(ownerId: string) {
    console.log(`[SLOTS] Récupération des slots pour ownerId: ${ownerId}`);

    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        ownerId,
        appointments: {
          some: {}, // Only slots that have at least one appointment
        },
      },
      orderBy: { start: 'asc' },
      include: {
        appointments: {
          include: {
            patient: true,
            kind: true, // Inclure le type de consultation
          },
        },
      },
    });

    console.log(`[SLOTS] ${slots.length} slots trouvés avec rendez-vous`);
    slots.forEach((slot, index) => {
      console.log(`[SLOTS] Slot ${index + 1}: ${slot.id} - ${new Date(slot.start).toISOString()} - ${slot.appointments.length} RDV`);
      slot.appointments.forEach((appt, i) => {
        console.log(`  [SLOTS]   RDV ${i + 1}: ${appt.id} - Patient: ${appt.patient?.fullName || 'N/A'}`);
      });
    });

    return slots;
  }

  /**
   * 🌍 Version publique — utilisée sur la fiche docteur
   * Ne renvoie que les créneaux à venir, actifs, et non pris
   */
  async findAllPublic(ownerId: string) {
    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        ownerId,
        status: 'ACTIVE',
        start: { gt: new Date() }, // uniquement les créneaux futurs
      },
      orderBy: { start: 'asc' },
      include: {
        appointments: true, // on filtre après
      },
    });

    // filtrer côté service : on garde seulement les slots sans rendez-vous
    return slots.filter((s) => !s.appointments || s.appointments.length === 0);
  }
  async create(data: {
    ownerId: string;
    ownerType: 'DOCTOR' | 'HOSPITAL' | string;
    start: Date | string;
    end: Date | string;
    capacity: number;
    status?: string;
  }) {
    const start = new Date(data.start);
    const end = new Date(data.end);

    // ✅ empêcher l’overlap : si un slot existe qui chevauche ce créneau → on refuse
    const exists = await this.prisma.availabilitySlot.findFirst({
      where: {
        ownerId: data.ownerId,
        // slot qui commence avant la fin ET qui finit après le début
        start: { lt: end },
        end: { gt: start },
      },
    });
    if (exists) {
      // tu peux mettre une BadRequest si tu préfères
      throw new ForbiddenException('Un créneau existe déjà sur cette plage horaire.');
    }

    return this.prisma.availabilitySlot.create({
      data: {
        ownerId: data.ownerId,
        ownerType: data.ownerType,
        start,
        end,
        capacity: data.capacity,
        status: data.status ?? 'ACTIVE',
      },
      include: {
        appointments: {
          include: { patient: true },
        },
      },
    });
  }

  async update(id: string, requesterId: string, dto: any) {
    const slot = await this.prisma.availabilitySlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Créneau introuvable');
    if (slot.ownerId !== requesterId) throw new ForbiddenException('Pas autorisé');
    return this.prisma.availabilitySlot.update({
      where: { id },
      data: dto,
      include: {
        appointments: { include: { patient: true } },
      },
    });
  }

  async remove(id: string, requesterId: string) {
    const slot = await this.prisma.availabilitySlot.findUnique({ where: { id } });
    if (!slot) throw new NotFoundException('Créneau introuvable');
    if (slot.ownerId !== requesterId) throw new ForbiddenException('Pas autorisé');
    return this.prisma.availabilitySlot.delete({ where: { id } });
  }
  async bulkCreate(ownerId: string, slots: Array<{ start: string; end: string; capacity?: number; status?: string }>) {
  if (!slots.length) return [];

  // on pourrait filtrer les doublons ici
  const data = slots.map((s) => ({
    ownerId,
    ownerType: 'DOCTOR',       // ou détecter depuis l'user
    start: new Date(s.start),
    end: new Date(s.end),
    capacity: s.capacity ?? 1,
    status: s.status ?? 'ACTIVE',
  }));

  return this.prisma.availabilitySlot.createMany({
    data,
    skipDuplicates: true, // si tu as un unique index (start, ownerId)
  });
}

  // src/slots/slots.service.ts (ajoute cette méthode)
async generateWeeklySlots(params: {
  ownerId: string;
  ownerType: 'DOCTOR' | 'HOSPITAL';
  // ex: ['MONDAY','TUESDAY']
  days: number[]; // 1=lundi ... 7=dimanche
  startHour: number; // 7
  endHour: number; // 18
  stepMinutes: number; // 30
  weeks: number; // 4 ou 12
}) {
  const { ownerId, ownerType, days, startHour, endHour, stepMinutes, weeks } = params;
  const now = new Date();
  const created: any[] = [];

  for (let w = 0; w < weeks; w++) {
    const base = new Date(now);
    base.setDate(now.getDate() + w * 7);

    for (const dayOfWeek of days) {
      // calcule le jour (lundi = 1)
      const d = new Date(base);
      const currentDow = d.getDay() === 0 ? 7 : d.getDay(); // 1..7
      const diff = dayOfWeek - currentDow;
      d.setDate(d.getDate() + diff);

      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += stepMinutes) {
          const start = new Date(d);
          start.setHours(h, m, 0, 0);
          const end = new Date(start.getTime() + stepMinutes * 60000);

          // ✅ check de chevauchement avant d’insérer
          const overlap = await this.prisma.availabilitySlot.findFirst({
            where: {
              ownerId,
              start: { lt: end },
              end: { gt: start },
            },
          });
          if (overlap) continue; // on saute ce créneau

          const s = await this.prisma.availabilitySlot.create({
            data: {
              ownerId,
              ownerType,
              start,
              end,
              capacity: 1,
              status: 'ACTIVE',
            },
          });
          created.push(s);
        }
      }
    }
  }
  return created;
}

async generateSlotsForPeriod(params: {
  ownerId: string;
  ownerType: 'DOCTOR' | 'HOSPITAL';
  days: number[];
  startHour: number;
  endHour: number;
  stepMinutes: number;
  startDate: Date;
  endDate: Date;
  excludedHours: string[];
  capacity: number;
}) {
  const {
    ownerId,
    ownerType,
    days,
    startHour,
    endHour,
    stepMinutes,
    startDate,
    endDate,
    excludedHours,
    capacity,
  } = params;

  const created: any[] = [];
  let skipped = 0;

  // Parcourir tous les jours entre startDate et endDate
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();

    // Vérifier si ce jour est sélectionné
    if (days.includes(dayOfWeek)) {
      // Générer les créneaux pour ce jour
      for (let h = startHour; h < endHour; h++) {
        for (let m = 0; m < 60; m += stepMinutes) {
          const hourStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

          // Vérifier si cette heure est exclue
          if (excludedHours.includes(hourStr)) {
            continue;
          }

          const start = new Date(currentDate);
          start.setHours(h, m, 0, 0);

          const end = new Date(start.getTime() + stepMinutes * 60000);

          // Vérifier s'il y a déjà un créneau qui chevauche
          const overlap = await this.prisma.availabilitySlot.findFirst({
            where: {
              ownerId,
              start: { lt: end },
              end: { gt: start },
            },
          });

          if (overlap) {
            skipped++;
            continue;
          }

          // Créer le créneau
          const slot = await this.prisma.availabilitySlot.create({
            data: {
              ownerId,
              ownerType,
              start,
              end,
              capacity,
              status: 'ACTIVE',
            },
          });

          created.push(slot);
        }
      }
    }

    // Passer au jour suivant
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return {
    created: created.length,
    skipped,
    message: `${created.length} créneaux créés, ${skipped} créneaux ignorés (déjà existants)`,
  };
}

}