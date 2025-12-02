import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../../database/entities/report.entity';
import { ReportFolder } from '../../database/entities/report-folder.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { LeadHistory } from '../../database/entities/lead-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ReportFolder, Lead, LeadHistory, User])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
 
