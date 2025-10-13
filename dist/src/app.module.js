"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const health_module_1 = require("./health/health.module");
const prisma_service_1 = require("./common/prisma.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const appointments_module_1 = require("./appointments/appointments.module");
const search_module_1 = require("./search/search.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({ imports: [health_module_1.HealthModule, users_module_1.UsersModule, auth_module_1.AuthModule, appointments_module_1.AppointmentsModule, search_module_1.SearchModule], providers: [prisma_service_1.PrismaService] })
], AppModule);
