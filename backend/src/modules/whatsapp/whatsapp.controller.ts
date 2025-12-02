import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { SendWhatsappDto } from './dto/send-whatsapp.dto';

@Controller('whatsapp')
export class WhatsappController {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue('whatsapp') private readonly whatsappQueue: Queue,
  ) {}

  // Webhook verification for WhatsApp Cloud API
  @Get('webhook')
  verifyWebhook(@Query('hub.mode') mode: string, @Query('hub.verify_token') token: string, @Query('hub.challenge') challenge: string, @Res() res: any) {
    const verify = this.config.get<string>('WHATSAPP_VERIFY_TOKEN');
    if (mode === 'subscribe' && token === verify) {
      return res.status(200).send(challenge);
    }
    return res.sendStatus(403);
  }

  // Webhook receiver (delivery statuses, inbound messages)
  @Post('webhook')
  async receiveWebhook(@Body() body: any) {
    // For now, just acknowledge; you can log or persist statuses here
    return { success: true };
  }

  // Enqueue send(s). If scheduleAt provided in the future, delay the job accordingly
  @Post('send')
  async send(@Body() dto: SendWhatsappDto) {
    const results: any[] = [];

    const delay = dto.scheduleAt ? Math.max(0, new Date(dto.scheduleAt).getTime() - Date.now()) : 0;

    for (const raw of dto.recipients) {
      const to = raw.startsWith('+') ? raw : `+${raw}`;
      const job = await this.whatsappQueue.add('send-template', {
        to,
        templateName: dto.templateName,
        language: dto.language,
        variables: dto.variables || [],
        mediaUrl: dto.mediaUrl,
      }, {
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
      results.push({ id: job.id, to });
    }

    return { queued: results.length, jobs: results };
  }
}
