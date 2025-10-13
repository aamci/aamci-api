import { Controller, Get, Query } from '@nestjs/common';

const demoDoctors = [
  { id: 'doc-1', name: 'Dr. A. Dupont', specialty: 'Cardiologie', city: 'Paris', hospital: 'Montparnasse' },
  { id: 'doc-2', name: 'Dr. B. Martin', specialty: 'Dermatologie', city: 'Paris', hospital: 'Saint-Louis' },
  { id: 'doc-3', name: 'Dr. C. Diallo', specialty: 'Pédiatrie',    city: 'Lyon',  hospital: 'Lumières' },
];

@Controller('search')
export class SearchController {
  @Get('doctors')
  doctors(@Query('q') q?: string, @Query('city') city?: string) {
    console.log('SearchController.doctors', { q, city });
    const list = demoDoctors.filter(d =>
      (!q || d.name.toLowerCase().includes((q||'').toLowerCase())) &&
      (!city || d.city.toLowerCase().includes((city||'').toLowerCase()))
    );
    return Array.isArray(list) ? list : [];
  }
}
