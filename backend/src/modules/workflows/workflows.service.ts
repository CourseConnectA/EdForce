import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions } from 'typeorm';
import { Workflow, WorkflowStatus } from '../../database/entities/workflow.entity';
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowResponseDto, WorkflowExecutionDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowsService {
  private readonly logger = new Logger(WorkflowsService.name);

  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<WorkflowResponseDto> {
    const workflow = this.workflowRepository.create(createWorkflowDto);
    const savedWorkflow = await this.workflowRepository.save(workflow);
    return this.mapToResponseDto(await this.findOne(savedWorkflow.id));
  }

  async findAll(options?: {
    page?: number;
    limit?: number;
    status?: WorkflowStatus;
    isActive?: boolean;
    createdBy?: string;
  }): Promise<{ workflows: WorkflowResponseDto[]; total: number; page: number; limit: number }> {
    const page = options?.page || 1;
    const limit = options?.limit || 10;
    const skip = (page - 1) * limit;

    const queryOptions: FindManyOptions<Workflow> = {
      where: {
        deleted: false,
        ...(options?.status && { status: options.status }),
        ...(options?.isActive !== undefined && { isActive: options.isActive }),
        ...(options?.createdBy && { createdBy: options.createdBy }),
      },
      relations: ['creator'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    };

    const [workflows, total] = await this.workflowRepository.findAndCount(queryOptions);

    return {
      workflows: workflows.map(workflow => this.mapToResponseDto(workflow)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id, deleted: false },
      relations: ['creator'],
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto): Promise<WorkflowResponseDto> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.update(id, updateWorkflowDto);
    return this.mapToResponseDto(await this.findOne(id));
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowRepository.update(id, { deleted: true, deletedAt: new Date() });
  }

  async activate(id: string): Promise<WorkflowResponseDto> {
    await this.workflowRepository.update(id, { isActive: true, status: WorkflowStatus.ACTIVE });
    return this.mapToResponseDto(await this.findOne(id));
  }

  async deactivate(id: string): Promise<WorkflowResponseDto> {
    await this.workflowRepository.update(id, { isActive: false, status: WorkflowStatus.INACTIVE });
    return this.mapToResponseDto(await this.findOne(id));
  }

  // Simple workflow executor
  async executeWorkflow(id: string, executionDto: WorkflowExecutionDto): Promise<{
    success: boolean;
    logs: string[];
    executionTime: number;
    error?: string;
  }> {
    const startTime = Date.now();
    const logs: string[] = [];

    try {
      const workflow = await this.findOne(id);
      
      if (!workflow.isActive) {
        throw new Error('Workflow is not active');
      }

      const graph = workflow.graph || { nodes: [], edges: [] };
      const nodes: any[] = graph.nodes || [];
      const edges: any[] = graph.edges || [];

      if (nodes.length === 0) {
        throw new Error('Workflow has no nodes');
      }

      const byId = new Map(nodes.map(n => [n.id, n]));
      const outgoing = new Map<string, any[]>();
      
      // Build adjacency list
      edges.forEach(edge => {
        if (!outgoing.has(edge.source)) {
          outgoing.set(edge.source, []);
        }
        outgoing.get(edge.source)!.push(edge);
      });

      // Find trigger node
      const triggerNode = nodes.find(n => n.data?.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      logs.push(`Starting workflow execution from trigger: ${triggerNode.data.label}`);

      // Execute workflow
      await this.executeNode(triggerNode.id, byId, outgoing, executionDto.payload, logs);

      const executionTime = Date.now() - startTime;
      
      // Update statistics
      await this.updateWorkflowStatistics(id, true, executionTime);

      return {
        success: true,
        logs,
        executionTime,
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logs.push(`Error: ${errorMessage}`);
      this.logger.error(`Workflow execution failed: ${errorMessage}`, error.stack);

      // Update statistics
      await this.updateWorkflowStatistics(id, false, executionTime);

      return {
        success: false,
        logs,
        executionTime,
        error: errorMessage,
      };
    }
  }

  private async executeNode(
    nodeId: string,
    byId: Map<string, any>,
    outgoing: Map<string, any[]>,
    payload: any,
    logs: string[]
  ): Promise<void> {
    const node = byId.get(nodeId);
    if (!node) return;

    const { type, label, config } = node.data;
    logs.push(`Executing ${type}: ${label}`);

    switch (type) {
      case 'trigger':
        // Trigger just starts the flow
        break;

      case 'condition':
        const conditionResult = await this.evaluateCondition(config, payload, logs);
        const nextEdges = outgoing.get(nodeId) || [];
        
        if (nextEdges.length >= 2) {
          // Convention: first edge for true, second for false
          const nextEdge = conditionResult ? nextEdges[0] : nextEdges[1];
          if (nextEdge) {
            await this.executeNode(nextEdge.target, byId, outgoing, payload, logs);
          }
        } else if (nextEdges.length === 1 && conditionResult) {
          await this.executeNode(nextEdges[0].target, byId, outgoing, payload, logs);
        }
        return; // Don't continue to linear flow

      case 'action':
        await this.executeAction(config, payload, logs);
        break;

      default:
        logs.push(`Unknown node type: ${type}`);
    }

    // Continue to next nodes (linear flow)
    const nextEdges = outgoing.get(nodeId) || [];
    for (const edge of nextEdges) {
      await this.executeNode(edge.target, byId, outgoing, payload, logs);
    }
  }

  private async evaluateCondition(config: any, payload: any, logs: string[]): Promise<boolean> {
    try {
      const { field, operator, value } = config || {};
      
      if (!field || !operator) {
        logs.push(`Invalid condition config: missing field or operator`);
        return false;
      }

      const fieldValue = this.getNestedValue(payload, field);
      logs.push(`Condition: ${field} (${fieldValue}) ${operator} ${value}`);

      switch (operator) {
        case 'equals':
          return fieldValue == value;
        case 'not_equals':
          return fieldValue != value;
        case 'greater_than':
          return Number(fieldValue) > Number(value);
        case 'less_than':
          return Number(fieldValue) < Number(value);
        case 'greater_than_or_equal':
          return Number(fieldValue) >= Number(value);
        case 'less_than_or_equal':
          return Number(fieldValue) <= Number(value);
        case 'contains':
          return String(fieldValue).includes(String(value));
        case 'starts_with':
          return String(fieldValue).startsWith(String(value));
        case 'ends_with':
          return String(fieldValue).endsWith(String(value));
        default:
          logs.push(`Unknown operator: ${operator}`);
          return false;
      }
    } catch (error) {
      logs.push(`Condition evaluation error: ${error.message}`);
      return false;
    }
  }

  private async executeAction(config: any, payload: any, logs: string[]): Promise<void> {
    try {
      const { actionType, ...actionConfig } = config || {};

      switch (actionType) {
        case 'webhook':
          logs.push(`Would call webhook: ${actionConfig.url}`);
          // TODO: Implement actual webhook call
          break;

        case 'email':
          logs.push(`Would send email to: ${actionConfig.recipient}`);
          // TODO: Implement email sending
          break;

        case 'create_task':
          logs.push(`Would create task: ${actionConfig.title}`);
          // TODO: Implement task creation
          break;

        case 'update_field':
          logs.push(`Would update field: ${actionConfig.field} = ${actionConfig.value}`);
          // TODO: Implement field update
          break;

        case 'log':
        default:
          logs.push(`Action executed: ${JSON.stringify(actionConfig)}`);
          break;
      }
    } catch (error) {
      logs.push(`Action execution error: ${error.message}`);
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async updateWorkflowStatistics(id: string, success: boolean, executionTime: number): Promise<void> {
    try {
      const workflow = await this.workflowRepository.findOne({ where: { id } });
      if (!workflow) return;

      const stats = workflow.statistics || {};
      const totalRuns = (stats.totalRuns || 0) + 1;
      const successfulRuns = (stats.successfulRuns || 0) + (success ? 1 : 0);
      const failedRuns = (stats.failedRuns || 0) + (success ? 0 : 1);
      const avgExecutionTime = stats.avgExecutionTime 
        ? (stats.avgExecutionTime + executionTime) / 2 
        : executionTime;

      await this.workflowRepository.update(id, {
        statistics: {
          ...stats,
          totalRuns,
          successfulRuns,
          failedRuns,
          lastRun: new Date(),
          avgExecutionTime,
        },
      });
    } catch (error) {
      this.logger.error('Failed to update workflow statistics', error);
    }
  }

  private mapToResponseDto(workflow: Workflow): WorkflowResponseDto {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      status: workflow.status,
      graph: workflow.graph,
      version: workflow.version,
      isActive: workflow.isActive,
      statistics: workflow.statistics,
      creator: workflow.creator ? {
        id: workflow.creator.id,
        firstName: workflow.creator.firstName,
        lastName: workflow.creator.lastName,
        email: workflow.creator.email,
      } : undefined,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }
}