import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.sub, createReviewDto);
  }

  @Get('doctor/:doctorId')
  findByDoctor(
    @Param('doctorId') doctorId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findByDoctor(
      doctorId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-reviews')
  findMyReviews(@Request() req) {
    return this.reviewsService.findByPatient(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('pending')
  findPendingReviews(@Request() req) {
    return this.reviewsService.findPendingReviews(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, req.user.sub, updateReviewDto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.reviewsService.remove(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/respond')
  addDoctorResponse(
    @Param('id') id: string,
    @Request() req,
    @Body('response') response: string,
  ) {
    return this.reviewsService.addDoctorResponse(id, req.user.sub, response);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/report')
  reportReview(@Param('id') id: string, @Request() req) {
    return this.reviewsService.reportReview(id, req.user.sub);
  }
}
