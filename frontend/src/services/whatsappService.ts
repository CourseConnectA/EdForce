import api from './apiService';

export interface SendWhatsAppPayload {
  recipients: string[];
  templateName: string;
  language: string; // en_US, etc.
  variables?: string[];
  mediaUrl?: string;
  scheduleAt?: string; // ISO datetime
}

const whatsappService = {
  async send(payload: SendWhatsAppPayload) {
    const { data } = await api.post('/whatsapp/send', payload);
    return data;
  },
};

export default whatsappService;
