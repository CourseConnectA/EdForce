import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CallsService } from './calls.service';

@UseGuards(AuthGuard('jwt'))
@Controller('calls')
export class CallsController {
  constructor(private svc: CallsService) {}

  @Post('log')
  logCall(@Req() req: any, @Body() body: {
    leadId: string;
    phoneNumber: string;
    callType: 'outgoing' | 'incoming' | 'missed';
    startTime: Date | string;
    endTime?: Date | string;
    duration?: number;
    deviceCallLogId?: string;
    disposition?: string;
    notes?: string;
  }) {
    return this.svc.logCall(req.user, body);
  }

  @Get('lead/:leadId')
  getCallsForLead(@Req() req: any, @Param('leadId') leadId: string) {
    return this.svc.getCallLogsForLead(req.user, leadId);
  }

  @Patch(':id/disposition')
  updateDisposition(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { disposition?: string; notes?: string }
  ) {
    return this.svc.updateDisposition(req.user, id, body);
  }

  @Get('analytics')
  getAnalytics(
    @Req() req: any,
    @Query('period') period?: 'daily' | 'monthly',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.svc.getAnalytics(req.user, { period, startDate, endDate });
  }

  @Post('batch-sync')
  batchSync(@Req() req: any, @Body() body: { calls: Array<any> }) {
    return this.svc.batchSync(req.user, body.calls || []);
  }
}
