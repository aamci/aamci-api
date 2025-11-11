import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { PrismaService } from '../common/prisma.service';
@Module({
    providers:[SearchService,PrismaService],
    controllers:[SearchController],
    exports:[SearchService], })
export class SearchModule {}
