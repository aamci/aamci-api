import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';

@Injectable()
export class FacilityManagerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const targetDoctorId = request.params.doctorId || request.body.doctorId;

    // Les admins ont toujours accès
    if (user.role === 'ADMIN') {
      return true;
    }

    // Les docteurs peuvent gérer leur propre agenda
    if (user.role === 'DOCTOR' && user.userId === targetDoctorId) {
      return true;
    }

    // Vérifier si l'utilisateur est un gestionnaire autorisé
    if (user.role === 'FACILITY_MANAGER') {
      const manager = await this.prisma.facilityManager.findUnique({
        where: { userId: user.userId },
        include: {
          facility: {
            include: {
              doctors: true,
            },
          },
        },
      });

      if (!manager) {
        return false;
      }

      // Vérifier si le docteur est dans la structure
      const facilityDoctorIds = manager.facility.doctors.map((d) => d.userId);
      if (facilityDoctorIds.includes(targetDoctorId)) {
        return true;
      }

      // Vérifier si le docteur est dans la liste override
      const overrideIds = manager.managedDoctorIds || [];
      return overrideIds.includes(targetDoctorId);
    }

    return false;
  }
}
