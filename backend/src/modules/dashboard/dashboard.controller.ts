import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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
  async getStats(@Request() req) {
    const role = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    const centerName = req.user?.centerName ?? null;
    const userId = req.user?.id as string;
    return this.service.getRoleAwareStats({ role, centerName, userId });
  }
}
