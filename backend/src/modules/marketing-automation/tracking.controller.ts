import { Controller, Get, Header, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { MarketingAutomationService } from './marketing-automation.service';

// 1x1 transparent PNG bytes
const PIXEL = Buffer.from(
  '89504E470D0A1A0A0000000D4948445200000001000000010806000000' +
  '1F15C4890000000A49444154789C6360000002000154010D0A2DB40000' +
  '000049454E44AE426082',
  'hex'
);

@Controller('marketing-automation/track')
export class TrackingController {
  constructor(private service: MarketingAutomationService) {}

  @Get('pixel')
  @Header('Content-Type', 'image/png')
  async pixel(
    @Query('leadId') leadId: string,
    @Query('campaignId') campaignId: string,
    @Query('batchId') batchId: string,
    @Query('itemId') itemId: string,
    @Res() res: Response,
  ) {
    await this.service.recordEvent({ leadId, campaignId, batchId, batchItemId: itemId, channel: 'email', event: 'opened', meta: { ua: res.req.headers['user-agent'] } });
    res.end(PIXEL);
  }

  @Get('click')
  async click(
    @Query('url') url: string,
    @Query('leadId') leadId: string,
    @Query('campaignId') campaignId: string,
    @Query('batchId') batchId: string,
    @Query('itemId') itemId: string,
    @Res() res: Response,
  ) {
    await this.service.recordEvent({ leadId, campaignId, batchId, batchItemId: itemId, channel: 'email', event: 'clicked' });
    // Basic safety: only redirect http/https
    if (!/^https?:\/\//i.test(url)) {
      return res.status(400).json({ message: 'Invalid URL' });
    }
    res.redirect(url);
  }
}
