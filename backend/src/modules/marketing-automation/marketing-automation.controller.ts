import { Controller, UseGuards, Post, Body, Request, Get, Query } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MarketingAutomationService } from './marketing-automation.service';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';

@ApiTags('Marketing Automation')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('marketing-automation')
export class MarketingAutomationController {
  constructor(private service: MarketingAutomationService) {}

  @Post('campaigns')
  @Roles('super-admin')
  createCampaign(@Request() req, @Body() body: any) {
    return this.service.createCampaign(req.user, body);
  }

  @Get('batches')
  @Roles('super-admin')
  listBatches(@Request() req, @Query() query: any) {
    return this.service.listBatches(req.user, query);
  }

  @Post('batches')
  @Roles('super-admin')
  createBatch(@Request() req, @Body() body: any) {
    return this.service.createBatch(req.user, body);
  }

  @Post('batches/assign')
  @Roles('super-admin')
  assignBatch(@Request() req, @Body() body: { batchId: string; assignedToId: string }) {
    return this.service.assignBatch(req.user, body.batchId, body.assignedToId);
  }

  @Post('batches/item')
  @Roles('super-admin')
  updateItem(@Request() req, @Body() body: any) {
    return this.service.updateItem(req.user, body.batchId, body.itemId, body.data || {});
  }

  @Get('events')
  @Roles('super-admin')
  listEvents(@Request() req, @Query() query: any) {
    return this.service.listEvents(req.user, query);
  }

  @Post('batches/send-email')
  @Roles('super-admin')
  sendEmailBatch(
    @Request() req,
    @Body()
    body: {
      batchId: string;
      subject: string;
      html: string;
      from?: string;
      scheduleAt?: string | null;
    },
  ) {
    return this.service.sendEmailBatch(req.user, body.batchId, {
      subject: body.subject,
      html: body.html,
      from: body.from,
      scheduleAt: body.scheduleAt,
    });
  }
}
