import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { WhatsappService } from './whatsapp.service';

@Processor('whatsapp')
export class WhatsappProcessor {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Process('send-template')
  async handleSend(job: Job<any>) {
    const { to, templateName, language, variables, mediaUrl } = job.data;
    return this.whatsapp.sendTemplate(to, templateName, language, variables, mediaUrl);
  }
}
