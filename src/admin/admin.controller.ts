import {
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

const ADMIN_ROLES = ['ADMIN', 'ADMIN_WRITE', 'ADMIN_READ', 'GUEST'];
const WRITE_ROLES = ['ADMIN', 'ADMIN_WRITE'];

function requireAdminAccess(user: any) {
  if (!user || !ADMIN_ROLES.includes(user.role)) {
    throw new ForbiddenException('Accès réservé aux administrateurs');
  }
}

function requireAdminWrite(user: any) {
  if (!user || !WRITE_ROLES.includes(user.role)) {
    throw new ForbiddenException('Droits d\'écriture requis (ADMIN ou ADMIN_WRITE)');
  }
}

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── Users ───────────────────────────────────────────────────────────────

  @Get('users')
  async getUsers(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getUsers({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      role,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('users/:id')
  async getUser(@Req() req, @Param('id') id: string) {
    requireAdminAccess(req.user);
    return this.adminService.getUserById(id);
  }

  @Post('users')
  async createUser(
    @Req() req,
    @Body() body: { email: string; password: string; role: string; fullName?: string },
  ) {
    requireAdminWrite(req.user);
    return this.adminService.createUser({ ...body, adminId: req.user.id });
  }

  @Patch('users/:id')
  async updateUser(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { role?: string; fullName?: string; isActive?: boolean },
  ) {
    requireAdminWrite(req.user);
    return this.adminService.updateUser(id, body);
  }

  @Post('users/:id/suspend')
  async suspendUser(@Req() req, @Param('id') id: string) {
    requireAdminWrite(req.user);
    return this.adminService.suspendUser(id);
  }

  @Post('users/:id/activate')
  async activateUser(@Req() req, @Param('id') id: string) {
    requireAdminWrite(req.user);
    return this.adminService.activateUser(id);
  }

  @Post('users/:id/reset-password')
  async resetUserPassword(@Req() req, @Param('id') id: string) {
    requireAdminWrite(req.user);
    return this.adminService.resetUserPassword(id, req.user.userId);
  }

  @Post('users/:id/verify-email')
  async verifyUserEmail(@Req() req, @Param('id') id: string) {
    requireAdminWrite(req.user);
    return this.adminService.verifyUserEmail(id, req.user.userId);
  }

  // ─── Appointments ─────────────────────────────────────────────────────────

  @Get('appointments')
  async getAppointments(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getAppointments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
    });
  }

  @Get('appointments/:id')
  async getAppointment(@Req() req, @Param('id') id: string) {
    requireAdminAccess(req.user);
    return this.adminService.getAppointmentById(id);
  }

  @Post('appointments/:id/cancel')
  async cancelAppointment(@Req() req, @Param('id') id: string) {
    requireAdminWrite(req.user);
    return this.adminService.cancelAppointment(id, req.user.id);
  }

  // ─── Transactions ─────────────────────────────────────────────────────────

  @Get('transactions')
  async getTransactions(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getTransactions({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      type,
      status,
    });
  }

  // ─── Doctors ──────────────────────────────────────────────────────────────

  @Get('doctors')
  async getDoctors(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getDoctors({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  // ─── Facilities ───────────────────────────────────────────────────────────

  @Get('facilities')
  async getFacilities(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getFacilities({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get('facilities/:id')
  async getFacility(@Req() req, @Param('id') id: string) {
    requireAdminAccess(req.user);
    return this.adminService.getFacilityById(id);
  }

  // ─── Audit logs ───────────────────────────────────────────────────────────

  @Get('audit')
  async getAuditLogs(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getAuditLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      adminId,
      action,
    });
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  @Get('settings')
  async getSettings(@Req() req) {
    requireAdminAccess(req.user);
    return this.adminService.getSettings();
  }

  @Put('settings/:key')
  async updateSetting(
    @Req() req,
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    requireAdminWrite(req.user);
    return this.adminService.updateSetting(key, body.value, req.user.id);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  @Get('stats/overview')
  async getStats(@Req() req) {
    requireAdminAccess(req.user);
    return this.adminService.getAdminStats();
  }

  @Get('stats/daily')
  async getDailyStats(@Req() req, @Query('days') days?: string) {
    requireAdminAccess(req.user);
    return this.adminService.getDailyStats(days ? Number(days) : 30);
  }

  // ─── Contracts ────────────────────────────────────────────────────────────

  @Get('contracts')
  async getContracts(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getContracts({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, type, status, search });
  }

  @Get('contracts/:id')
  async getContract(@Req() req, @Param('id') id: string) {
    requireAdminAccess(req.user);
    return this.adminService.getContractById(id);
  }

  @Post('contracts')
  async createContract(@Req() req, @Body() body: any) {
    requireAdminWrite(req.user);
    return this.adminService.createContract({ ...body, adminId: req.user.userId });
  }

  @Patch('contracts/:id')
  async updateContract(@Req() req, @Param('id') id: string, @Body() body: any) {
    requireAdminWrite(req.user);
    return this.adminService.updateContract(id, body, req.user.userId);
  }

  // ─── Support Tickets ──────────────────────────────────────────────────────

  @Get('tickets')
  async getTickets(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('authorType') authorType?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    requireAdminAccess(req.user);
    return this.adminService.getTickets({ page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined, authorType, status, priority });
  }

  @Patch('tickets/:id')
  async updateTicket(@Req() req, @Param('id') id: string, @Body() body: any) {
    requireAdminWrite(req.user);
    return this.adminService.updateTicket(id, body, req.user.userId);
  }

  // ─── Detailed Statistics ──────────────────────────────────────────────────

  @Get('stats/payments')
  async getPaymentStats(@Req() req, @Query('days') days?: string) {
    requireAdminAccess(req.user);
    return this.adminService.getPaymentStats(days ? Number(days) : 30);
  }

  @Get('stats/patients')
  async getPatientStats(@Req() req) {
    requireAdminAccess(req.user);
    return this.adminService.getPatientStats();
  }

  @Get('stats/doctors-detail')
  async getDoctorStats(@Req() req) {
    requireAdminAccess(req.user);
    return this.adminService.getDoctorStats();
  }

  // ─── Encryption ───────────────────────────────────────────────────────────

  @Get('encryption/status')
  async getEncryptionStatus(@Req() req) {
    requireAdminAccess(req.user);
    return this.adminService.getEncryptionStatus();
  }
}
