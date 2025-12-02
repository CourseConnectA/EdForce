import api from './apiService';

export interface CreateCampaignPayload {
  name: string;
  description?: string;
}

export interface CreateBatchPayload {
  name: string;
  campaignId?: string | null;
  items?: Array<{ leadId?: string | null; payload: any }>;
}

export interface SendEmailBatchPayload {
  batchId: string;
  subject: string;
  html: string;
  from?: string;
  scheduleAt?: string | null;
}

export const marketingService = {
  createCampaign: (payload: CreateCampaignPayload) => api.post('/marketing-automation/campaigns', payload),
  listBatches: () => api.get('/marketing-automation/batches'),
  createBatch: (payload: CreateBatchPayload) => api.post('/marketing-automation/batches', payload),
  assignBatch: (batchId: string, assignedToId: string) => api.post('/marketing-automation/batches/assign', { batchId, assignedToId }),
  updateItem: (batchId: string, itemId: string, data: any) => api.post('/marketing-automation/batches/item', { batchId, itemId, data }),
  listEvents: (query?: Record<string, any>) => api.get('/marketing-automation/events', { params: query || {} }),
  sendEmailBatch: (payload: SendEmailBatchPayload) => api.post('/marketing-automation/batches/send-email', payload),
};

export default marketingService;
