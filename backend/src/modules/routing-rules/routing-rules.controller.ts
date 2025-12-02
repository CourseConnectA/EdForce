import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RoutingRulesService } from './routing-rules.service';

@UseGuards(AuthGuard('jwt'))
@Controller('rules')
export class RoutingRulesController {
  constructor(private svc: RoutingRulesService) {}

  @Get('active')
  getActive(@Req() req: any) {
    return this.svc.getActive(req.user);
  }

  @Post('start')
  start(@Req() req: any, @Body() body: { ruleType: 'round_robin'|'skill_match'; activeUntil: string; config?: any }) {
    return this.svc.start(req.user, body);
  }

  @Post('stop')
  stop(@Req() req: any) {
    return this.svc.stop(req.user);
  }
}
