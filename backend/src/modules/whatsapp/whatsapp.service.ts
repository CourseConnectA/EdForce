import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TemplateComponentParameter {
  type: 'text' | 'image' | 'document';
  text?: string;
  image?: { link: string };
  document?: { link: string };
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token: string;
  private readonly phoneNumberId: string;

  constructor(private readonly config: ConfigService) {
    this.token = this.config.get<string>('WHATSAPP_TOKEN') || '';
    this.phoneNumberId = this.config.get<string>('WHATSAPP_PHONE_NUMBER_ID') || '';
  }

  async sendTemplate(to: string, templateName: string, language: string, variables?: string[], mediaUrl?: string) {
    const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;

    const components: any[] = [];

    // Header media if provided
    if (mediaUrl) {
      components.push({
        type: 'header',
        parameters: [
          {
            type: 'image',
            image: { link: mediaUrl },
          },
        ],
      });
    }

    // Body variables
    if (variables && variables.length) {
      components.push({
        type: 'body',
        parameters: variables.map((v) => ({ type: 'text', text: String(v) })),
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`WhatsApp send failed: ${res.status} ${text}`);
      throw new Error(`WhatsApp API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    this.logger.debug(`WhatsApp sent to ${to}: ${JSON.stringify(data)}`);
    return data;
  }
}
