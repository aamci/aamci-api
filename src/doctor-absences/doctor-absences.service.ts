import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateAbsenceDto } from './dto/create-absence.dto';
import { UpdateAbsenceDto } from './dto/update-absence.dto';

@Injectable()
export class DoctorAbsencesService {
  constructor(private prisma: PrismaService) {}

  async create(doctorId: string, dto: CreateAbsenceDto) {
    // Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (startDate > endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping absences
    const overlapping = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        'An absence already exists for this period'
      );
    }

    // Create the absence
    const absence = await this.prisma.doctorAbsence.create({
      data: {
        doctorId,
        startDate,
        endDate,
        type: dto.type,
        reason: dto.reason,
        blockSlots: dto.blockSlots ?? true,
        cancelAppointments: dto.cancelAppointments ?? false,
      },
    });

    // If cancelAppointments is true, cancel all appointments in the period
    if (dto.cancelAppointments) {
      await this.cancelAppointmentsInPeriod(doctorId, startDate, endDate);
    }

    return absence;
  }

  async findAllByDoctor(doctorId: string) {
    return this.prisma.doctorAbsence.findMany({
      where: { doctorId },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: string, doctorId: string) {
    const absence = await this.prisma.doctorAbsence.findUnique({
      where: { id },
    });

    if (!absence) {
      throw new NotFoundException('Absence not found');
    }

    if (absence.doctorId !== doctorId) {
      throw new ForbiddenException('Not authorized to access this absence');
    }

    return absence;
  }

  async update(id: string, doctorId: string, dto: UpdateAbsenceDto) {
    // Check ownership
    const existingAbsence = await this.findOne(id, doctorId);

    // Validate dates if provided
    if (dto.startDate || dto.endDate) {
      const startDate = dto.startDate ? new Date(dto.startDate) : existingAbsence.startDate;
      const endDate = dto.endDate ? new Date(dto.endDate) : existingAbsence.endDate;

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }

      // Check for overlapping absences (excluding current one)
      const overlapping = await this.prisma.doctorAbsence.findFirst({
        where: {
          doctorId,
          id: { not: id },
          OR: [
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: startDate } },
              ],
            },
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: endDate } },
              ],
            },
            {
              AND: [
                { startDate: { gte: startDate } },
                { endDate: { lte: endDate } },
              ],
            },
          ],
        },
      });

      if (overlapping) {
        throw new BadRequestException(
          'An absence already exists for this period'
        );
      }
    }

    // Update the absence
    const updateData: any = {};
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.endDate) updateData.endDate = new Date(dto.endDate);
    if (dto.type) updateData.type = dto.type;
    if (dto.reason !== undefined) updateData.reason = dto.reason;
    if (dto.blockSlots !== undefined) updateData.blockSlots = dto.blockSlots;
    if (dto.cancelAppointments !== undefined) updateData.cancelAppointments = dto.cancelAppointments;

    return this.prisma.doctorAbsence.update({
      where: { id },
      data: updateData,
    });
  }

  async remove(id: string, doctorId: string) {
    // Check ownership
    await this.findOne(id, doctorId);

    return this.prisma.doctorAbsence.delete({
      where: { id },
    });
  }

  /**
   * Check if a doctor has an absence covering a specific date
   */
  async hasAbsenceOnDate(doctorId: string, date: Date): Promise<boolean> {
    const absence = await this.prisma.doctorAbsence.findFirst({
      where: {
        doctorId,
        startDate: { lte: date },
        endDate: { gte: date },
        blockSlots: true,
      },
    });

    return !!absence;
  }

  /**
   * Find all absences for a doctor in a specific period
   */
  async findAbsencesInPeriod(
    doctorId: string,
    startDate: Date,
    endDate: Date,
  ) {
    return this.prisma.doctorAbsence.findMany({
      where: {
        doctorId,
        blockSlots: true,
        OR: [
          {
            AND: [
              { startDate: { lte: startDate } },
              { endDate: { gte: startDate } },
            ],
          },
          {
            AND: [
              { startDate: { lte: endDate } },
              { endDate: { gte: endDate } },
            ],
          },
          {
            AND: [
              { startDate: { gte: startDate } },
              { endDate: { lte: endDate } },
            ],
          },
        ],
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Cancel all appointments in a period
   */
  private async cancelAppointmentsInPeriod(
    doctorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    // Find all slots in the period
    const slots = await this.prisma.availabilitySlot.findMany({
      where: {
        ownerId: doctorId,
        start: { gte: startDate, lte: endDate },
      },
      include: {
        appointments: true,
      },
    });

    // Cancel all appointments
    const appointmentIds = slots
      .flatMap(slot => slot.appointments)
      .map(apt => apt.id);

    if (appointmentIds.length > 0) {
      await this.prisma.appointment.updateMany({
        where: { id: { in: appointmentIds } },
        data: { status: 'CANCELLED' },
      });
    }
  }
}
