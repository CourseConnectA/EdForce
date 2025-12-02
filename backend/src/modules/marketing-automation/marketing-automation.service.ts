import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutomationCampaign } from '../../database/entities/automation-campaign.entity';
import { AutomationStep } from '../../database/entities/automation-step.entity';
import { AutomationBatch } from '../../database/entities/automation-batch.entity';
import { AutomationBatchItem } from '../../database/entities/automation-batch-item.entity';
import { AutomationEvent } from '../../database/entities/automation-event.entity';
import { Lead } from '../../database/entities/lead.entity';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MarketingAutomationService {
  private logger = new Logger(MarketingAutomationService.name);
  constructor(
    @InjectRepository(AutomationCampaign) private campaigns: Repository<AutomationCampaign>,
    @InjectRepository(AutomationStep) private steps: Repository<AutomationStep>,
    @InjectRepository(AutomationBatch) private batches: Repository<AutomationBatch>,
    @InjectRepository(AutomationBatchItem) private items: Repository<AutomationBatchItem>,
    @InjectRepository(AutomationEvent) private events: Repository<AutomationEvent>,
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectQueue('marketing-email') private emailQueue: Queue,
  ) {}

  ensureAdmin(user: any) {
    const role = user?.role || (user?.isAdmin ? 'admin' : 'agent');
    if (!['super-admin', 'admin'].includes(role)) {
      throw new ForbiddenException('Admins only');
    }
  }

  async createCampaign(user: any, data: Partial<AutomationCampaign>) {
    this.ensureAdmin(user);
    const campaign = this.campaigns.create({ ...data, ownerId: user.id, status: 'draft' as any });
    return this.campaigns.save(campaign);
  }

  async listBatches(user: any, query: any) {
    this.ensureAdmin(user);
    return this.batches.find({ order: { dateEntered: 'DESC' } as any, take: 50 });
  }

  async createBatch(user: any, data: { name: string; campaignId?: string | null; items?: any[] }) {
    this.ensureAdmin(user);
    const batch = await this.batches.save(this.batches.create({ name: data.name, campaignId: data.campaignId || null, status: 'draft' as any }));
    if (data.items?.length) {
      const toSave = data.items.map((payload) => this.items.create({ batchId: batch.id, leadId: payload?.leadId || null, payload, status: 'pending' as any }));
      await this.items.save(toSave);
    }
    return batch;
  }

  async assignBatch(user: any, batchId: string, assignedToId: string) {
    this.ensureAdmin(user);
    await this.batches.update(batchId, { assignedToId, status: 'assigned' as any });
    return this.batches.findOne({ where: { id: batchId } });
  }

  async updateItem(user: any, batchId: string, itemId: string, data: Partial<AutomationBatchItem>) {
    this.ensureAdmin(user);
    await this.items.update({ id: itemId, batchId }, data);
    return this.items.findOne({ where: { id: itemId } });
  }

  async listEvents(user: any, query: any) {
    this.ensureAdmin(user);
    const { channel, event, leadId, batchId, campaignId, limit = 50 } = query || {};
    const where: any = {};
    if (channel) where.channel = channel;
    if (event) where.event = event;
    if (leadId) where.leadId = leadId;
    if (batchId) where.batchId = batchId;
    if (campaignId) where.campaignId = campaignId;
    return this.events.find({ where, order: { dateEntered: 'DESC' } as any, take: Number(limit) });
  }

  async sendEmailBatch(
    user: any,
    batchId: string,
    config: { subject: string; html: string; from?: string; scheduleAt?: string | null },
  ) {
    this.ensureAdmin(user);
    const batch = await this.batches.findOne({ where: { id: batchId } });
    if (!batch) throw new ForbiddenException('Batch not found');

    const items = await this.items.find({ where: { batchId } });
    const scheduleAt = config?.scheduleAt ? new Date(config.scheduleAt) : null;
    const delay = scheduleAt ? Math.max(0, scheduleAt.getTime() - Date.now()) : 0;

    const tryQueue = async () => {
      for (const it of items) {
        // Resolve recipient email
        let email: string | undefined = (it.payload && (it.payload.email || it.payload.email1 || it.payload.to)) || undefined;
        if (!email && it.leadId) {
          const lead = await this.leads.findOne({ where: { id: it.leadId } });
          email = lead?.email ?? undefined;
        }

        if (!email) {
          await this.recordEvent({ channel: 'email', event: 'failed', batchId, batchItemId: it.id, campaignId: batch.campaignId, leadId: it.leadId, meta: { reason: 'missing_email' } });
          continue;
        }

        // Queue the email job
        await this.emailQueue.add(
          'send',
          {
            batchId,
            itemId: it.id,
            leadId: it.leadId,
            campaignId: batch.campaignId,
            email,
            subject: config.subject,
            html: config.html,
            from: config.from || null,
          },
          delay ? { delay } : undefined,
        );

        await this.recordEvent({ channel: 'email', event: 'queued', batchId, batchItemId: it.id, campaignId: batch.campaignId, leadId: it.leadId });
      }
    };

    const tryDirectSend = async () => {
      const transporter = nodemailer.createTransport({
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

  const trackingBase = process.env.PUBLIC_BASE_URL || process.env.API_BASE_URL || ('http://localhost:' + (process.env.PORT || 3000));

      const rewriteLinksWithTracking = (html: string, base: string, params: Record<string, string>) => {
        if (!html) return html;
        return html.replace(/href=\"(.*?)\"/gi, (match, p1) => {
          try {
            const target = encodeURIComponent(p1);
            const query = new URLSearchParams({ ...params, url: decodeURIComponent(target) }).toString();
            const wrapped = base + '/marketing-automation/track/click?' + query;
            return 'href="' + wrapped + '"';
          } catch {
            return match;
          }
        });
      };

      const injectOpenPixel = (html: string, base: string, params: Record<string, string>) => {
        const query = new URLSearchParams(params).toString();
        const pixelTag = '<img src="' + base + '/marketing-automation/track/pixel?' + query + '" width="1" height="1" style="display:none;" alt="" />';
        if (!html) return pixelTag;
        if (/<\/body>/i.test(html)) {
          return html.replace(/<\/body>/i, pixelTag + '</body>');
        }
        return html + pixelTag;
      };

      for (const it of items) {
        let email: string | undefined = (it.payload && (it.payload.email || it.payload.email1 || it.payload.to)) || undefined;
        if (!email && it.leadId) {
          const lead = await this.leads.findOne({ where: { id: it.leadId } });
          email = lead?.email ?? undefined;
        }

        if (!email) {
          await this.recordEvent({ channel: 'email', event: 'failed', batchId, batchItemId: it.id, campaignId: batch.campaignId, leadId: it.leadId, meta: { reason: 'missing_email' } });
          continue;
        }

        const params = {
          leadId: it.leadId || '',
          campaignId: batch.campaignId || '',
          batchId,
          itemId: it.id,
        } as Record<string, string>;

        let html = config.html || '';
        html = rewriteLinksWithTracking(html, trackingBase, params);
        html = injectOpenPixel(html, trackingBase, params);

        try {
          await transporter.sendMail({
            from: config.from || process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER,
            to: email,
            subject: config.subject,
            html,
          });

          await this.recordEvent({ channel: 'email', event: 'sent', batchId, batchItemId: it.id, campaignId: batch.campaignId, leadId: it.leadId });
        } catch (err: any) {
          await this.recordEvent({ channel: 'email', event: 'failed', batchId, batchItemId: it.id, campaignId: batch.campaignId, leadId: it.leadId, meta: { message: err?.message || 'send_failed' } });
          throw err;
        }
      }
    };

    try {
      await tryQueue();
    } catch (err: any) {
  this.logger.warn('Queue unavailable, falling back to direct send: ' + (err && (err as any).message ? (err as any).message : String(err)));
      await tryDirectSend();
    }

    return { ok: true, count: items.length, delay };
  }

  // Public tracking helpers
  private scoreFor(evt: string) {
    switch (evt) {
      case 'opened': return 5;
      case 'clicked': return 15;
      case 'replied': return 30;
      default: return 0;
    }
  }

  async recordEvent(data: Partial<AutomationEvent>) {
    const scoreDelta = this.scoreFor(String(data.event));
    const event = this.events.create({ ...data, scoreDelta } as any);
    const saved = await this.events.save(event);
    if (data.leadId && scoreDelta) {
      await this.leads
        .createQueryBuilder()
        .update(Lead)
        .set({
          leadScorePercent: () => 'LEAST(100, COALESCE(lead_score_percent, 0) + ' + scoreDelta + ')',
        })
        .where('id = :id', { id: data.leadId })
        .execute();
    }
    return saved;
  }
}
