import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../common/roles.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get('stats')
  @ApiQuery({ name: 'dateFilter', required: false, enum: ['today', 'yesterday', 'past_week', 'past_month', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'counselorId', required: false, type: String, description: 'Filter by counselor (for center-manager)' })
  async getStats(
    @Request() req,
    @Query('dateFilter') dateFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('counselorId') counselorId?: string,
  ) {
    const role = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    const centerName = req.user?.centerName ?? null;
    const userId = req.user?.id as string;
    return this.service.getRoleAwareStats({ role, centerName, userId }, { dateFilter, startDate, endDate, counselorId });
  }
}
