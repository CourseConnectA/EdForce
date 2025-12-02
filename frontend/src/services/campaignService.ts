import api from './apiService';
import { Campaign, CreateCampaignDto, UpdateCampaignDto, CampaignStats } from '../types/campaign.types';

export const campaignService = {
  // Get all campaigns
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    ownerId?: string;
  }): Promise<{
    campaigns: Campaign[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get('/campaigns', { params });
    return response;
  },

  // Get campaign by ID
  async getCampaign(id: string): Promise<Campaign> {
    const response = await api.get(`/campaigns/${id}`);
    return response;
  },

  // Create new campaign
  async createCampaign(data: CreateCampaignDto): Promise<Campaign> {
    const response = await api.post('/campaigns', data);
    return response;
  },

  // Update campaign
  async updateCampaign(id: string, data: UpdateCampaignDto): Promise<Campaign> {
    const response = await api.patch(`/campaigns/${id}`, data);
    return response;
  },

  // Delete campaign
  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  },

  // Get campaign statistics
  async getCampaignStats(): Promise<CampaignStats> {
    const response = await api.get('/campaigns/stats');
    return response;
  },
};