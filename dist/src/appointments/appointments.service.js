"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentsService = void 0;
// src/appointments/appointments.service.ts
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../common/prisma.service");
let AppointmentsService = class AppointmentsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    list() {
        return this.prisma.appointment.findMany({
            take: 25,
            orderBy: { createdAt: 'desc' },
        });
    }
    create(dto) {
        return this.prisma.appointment.create({
            data: {
                slotId: dto.slotId,
                patientId: dto.patientId,
                status: 'PENDING', // <-- fixed
                notes: dto.notes,
            },
        });
    }
};
exports.AppointmentsService = AppointmentsService;
exports.AppointmentsService = AppointmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AppointmentsService);
