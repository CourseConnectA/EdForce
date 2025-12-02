import api from './apiService';
import { Workflow, CreateWorkflowDto, UpdateWorkflowDto, WorkflowExecutionDto, WorkflowExecutionResult } from '../types/workflow.types';

export const workflowService = {
  // Get all workflows
  async getWorkflows(params?: {
    page?: number;
    limit?: number;
    status?: string;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<{
    workflows: Workflow[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await api.get('/workflows', { params });
    return response;
  },

  // Get workflow by ID
  async getWorkflow(id: string): Promise<Workflow> {
    const response = await api.get(`/workflows/${id}`);
    return response;
  },

  // Create new workflow
  async createWorkflow(data: CreateWorkflowDto): Promise<Workflow> {
    const response = await api.post('/workflows', data);
    return response;
  },

  // Update workflow
  async updateWorkflow(id: string, data: UpdateWorkflowDto): Promise<Workflow> {
    const response = await api.patch(`/workflows/${id}`, data);
    return response;
  },

  // Delete workflow
  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  // Activate workflow
  async activateWorkflow(id: string): Promise<Workflow> {
    const response = await api.post(`/workflows/${id}/activate`);
    return response;
  },

  // Deactivate workflow
  async deactivateWorkflow(id: string): Promise<Workflow> {
    const response = await api.post(`/workflows/${id}/deactivate`);
    return response;
  },

  // Execute workflow
  async executeWorkflow(id: string, data: WorkflowExecutionDto): Promise<WorkflowExecutionResult> {
    const response = await api.post(`/workflows/${id}/execute`, data);
    return response;
  },
};