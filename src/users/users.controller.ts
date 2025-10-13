import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
@Controller()
export class UsersController{
  @UseGuards(JwtAuthGuard)
  @Get('/me')
  me(@Req() req:any){ return { userId:req.user.userId, email:req.user.email, role:req.user.role }; }
}
