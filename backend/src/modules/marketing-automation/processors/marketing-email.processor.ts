import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import * as nodemailer from 'nodemailer';
import { MarketingAutomationService } from '../marketing-automation.service';

function rewriteLinksWithTracking(html: string, trackingBase: string, params: Record<string, string>) {
  if (!html) return html;
  // Basic href rewrite
  return html.replace(/href=\"(.*?)\"/gi, (match, p1) => {
    try {
      const target = encodeURIComponent(p1);
      const query = new URLSearchParams({ ...params, url: decodeURIComponent(target) }).toString();
      const wrapped = `${trackingBase}/marketing-automation/track/click?${query}`;
      return `href="${wrapped}"`;
    } catch {
      return match; // leave unchanged on error
    }
  });
}

function injectOpenPixel(html: string, trackingBase: string, params: Record<string, string>) {
  const query = new URLSearchParams(params).toString();
  const pixelTag = `<img src="${trackingBase}/marketing-automation/track/pixel?${query}" width="1" height="1" style="display:none;" alt="" />`;
  if (!html) return pixelTag;
  if (/</.test(html)) {
    return html.replace(/<\/body>/i, `${pixelTag}</body>`);
  }
  return html + pixelTag;
}

@Processor('marketing-email')
export class MarketingEmailProcessor {
  private transporter: nodemailer.Transporter;
  private trackingBase: string;

  constructor(private maService: MarketingAutomationService) {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || process.env.MAIL_HOST,
      port: Number(process.env.SMTP_PORT || process.env.MAIL_PORT || 587),
      secure: /true|465/.test(String(process.env.SMTP_SECURE || '')),
      auth: (process.env.SMTP_USER || process.env.MAIL_USER)
        ? {
            user: process.env.SMTP_USER || process.env.MAIL_USER,
            pass: process.env.SMTP_PASS || process.env.MAIL_PASSWORD,
          }
        : undefined,
    } as any);
    this.trackingBase = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
  }

  @Process('send')
  async handleSend(job: Job<{
    batchId: string;
    itemId: string;
    leadId?: string | null;
    campaignId?: string | null;
    email: string;
    subject: string;
    html: string;
    from?: string | null;
  }>) {
    const { batchId, itemId, leadId, campaignId, email, subject } = job.data;

    const params = {
      leadId: leadId || '',
      campaignId: campaignId || '',
      batchId,
      itemId,
    } as Record<string, string>;

    // Build HTML with tracking
    let html = job.data.html || '';
    html = rewriteLinksWithTracking(html, this.trackingBase, params);
    html = injectOpenPixel(html, this.trackingBase, params);

    try {
      await this.transporter.sendMail({
        from: job.data.from || process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER,
        to: email,
        subject,
        html,
      });

      await this.maService.recordEvent({
        channel: 'email',
        event: 'sent',
        batchId,
        batchItemId: itemId,
        campaignId: campaignId || null,
        leadId: leadId || null,
      });
    } catch (err: any) {
      await this.maService.recordEvent({
        channel: 'email',
        event: 'failed',
        batchId,
        batchItemId: itemId,
        campaignId: campaignId || null,
        leadId: leadId || null,
        meta: { message: err?.message || 'send_failed' },
      });
      throw err;
    }
  }
}
