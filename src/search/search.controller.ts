// src/search/search.controller.ts
import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get('doctors')
  async doctors(
    @Query('q') q?: string,
    @Query('city') city?: string,
    @Query('specialty') specialty?: string,
    @Query('facilityId') facilityId?: string,
  ) {
    return this.search.doctors(q, city, specialty, facilityId);
  }

  @Get('hospitals')
  async hospitals(@Query('q') q?: string, @Query('city') city?: string) {
    return this.search.hospitals(q, city);
  }

  @Get('pharmacies')
  async pharmacies(@Query('q') q?: string, @Query('city') city?: string) {
    return this.search.pharmacies(q, city);
  }
}