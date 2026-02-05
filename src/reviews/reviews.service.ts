import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(patientId: string, createReviewDto: CreateReviewDto) {
    const { doctorId, appointmentId, ...reviewData } = createReviewDto;

    // Verify doctor exists
    const doctor = await this.prisma.doctorProfile.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // If appointmentId provided, verify it belongs to this patient and doctor
    if (appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          patientId,
          slot: {
            ownerId: doctor.userId,
          },
          status: 'CONFIRMED',
        },
      });

      if (!appointment) {
        throw new BadRequestException('Invalid appointment or not completed');
      }

      // Check if review already exists for this appointment
      const existingReview = await this.prisma.doctorReview.findUnique({
        where: { appointmentId },
      });

      if (existingReview) {
        throw new BadRequestException('Review already exists for this appointment');
      }
    }

    // Create review
    const review = await this.prisma.doctorReview.create({
      data: {
        doctorId,
        patientId,
        appointmentId,
        ...reviewData,
        isVerified: !!appointmentId,
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update doctor's average rating
    await this.updateDoctorRating(doctorId);

    return review;
  }

  async findByDoctor(doctorId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.doctorReview.findMany({
        where: {
          doctorId,
          isPublic: true,
          isApproved: true,
        },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.doctorReview.count({
        where: {
          doctorId,
          isPublic: true,
          isApproved: true,
        },
      }),
    ]);

    // Get rating distribution
    const ratingDistribution = await this.prisma.doctorReview.groupBy({
      by: ['overallRating'],
      where: {
        doctorId,
        isPublic: true,
        isApproved: true,
      },
      _count: true,
    });

    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      distribution[r.overallRating as keyof typeof distribution] = r._count;
    });

    return {
      reviews,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      ratingDistribution: distribution,
    };
  }

  async findByPatient(patientId: string) {
    return this.prisma.doctorReview.findMany({
      where: { patientId },
      include: {
        doctor: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingReviews(patientId: string) {
    // Find completed appointments without reviews
    const appointmentsWithoutReviews = await this.prisma.appointment.findMany({
      where: {
        patientId,
        status: 'CONFIRMED',
        review: null,
        slot: {
          start: {
            lt: new Date(),
          },
        },
      },
      include: {
        slot: true,
        kind: true,
      },
      orderBy: {
        slot: {
          start: 'desc',
        },
      },
      take: 10,
    });

    // Fetch doctor profiles for each appointment
    const ownerIds = [...new Set(appointmentsWithoutReviews.map((a) => a.slot.ownerId))];
    const doctorProfiles = await this.prisma.doctorProfile.findMany({
      where: {
        userId: { in: ownerIds },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const doctorMap = new Map(doctorProfiles.map((d) => [d.userId, d]));

    return appointmentsWithoutReviews.map((appointment) => ({
      ...appointment,
      doctor: doctorMap.get(appointment.slot.ownerId) || null,
    }));
  }

  async update(reviewId: string, patientId: string, updateReviewDto: UpdateReviewDto) {
    const review = await this.prisma.doctorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.patientId !== patientId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.doctorReview.update({
      where: { id: reviewId },
      data: updateReviewDto,
    });

    // Update doctor's average rating
    await this.updateDoctorRating(review.doctorId);

    return updatedReview;
  }

  async remove(reviewId: string, patientId: string) {
    const review = await this.prisma.doctorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.patientId !== patientId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.doctorReview.delete({
      where: { id: reviewId },
    });

    // Update doctor's average rating
    await this.updateDoctorRating(review.doctorId);

    return { message: 'Review deleted successfully' };
  }

  async addDoctorResponse(reviewId: string, doctorUserId: string, response: string) {
    const review = await this.prisma.doctorReview.findUnique({
      where: { id: reviewId },
      include: {
        doctor: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.doctor.userId !== doctorUserId) {
      throw new ForbiddenException('You can only respond to reviews for your profile');
    }

    return this.prisma.doctorReview.update({
      where: { id: reviewId },
      data: {
        doctorResponse: response,
        doctorRespondedAt: new Date(),
      },
    });
  }

  async reportReview(reviewId: string, patientId: string) {
    const review = await this.prisma.doctorReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return this.prisma.doctorReview.update({
      where: { id: reviewId },
      data: {
        reportCount: { increment: 1 },
        isReported: true,
      },
    });
  }

  private async updateDoctorRating(doctorId: string) {
    const stats = await this.prisma.doctorReview.aggregate({
      where: {
        doctorId,
        isPublic: true,
        isApproved: true,
      },
      _avg: {
        overallRating: true,
      },
      _count: true,
    });

    await this.prisma.doctorProfile.update({
      where: { id: doctorId },
      data: {
        averageRating: stats._avg.overallRating || 0,
        totalReviews: stats._count,
      },
    });
  }
}
