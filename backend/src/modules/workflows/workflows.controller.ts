import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WorkflowsService } from './workflows.service';
import { CreateWorkflowDto, UpdateWorkflowDto, WorkflowResponseDto, WorkflowExecutionDto } from './dto/workflow.dto';
import { WorkflowStatus } from '../../database/entities/workflow.entity';

@ApiTags('workflows')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new workflow' })
  @ApiResponse({ status: 201, description: 'Workflow created successfully' })
  async create(
    @Body() createWorkflowDto: CreateWorkflowDto,
    @Request() req: any,
  ): Promise<WorkflowResponseDto> {
    if (!createWorkflowDto.createdBy) {
      createWorkflowDto.createdBy = req.user.sub;
    }
    return this.workflowsService.create(createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all workflows' })
  @ApiResponse({ status: 200, description: 'Workflows retrieved successfully' })
  async findAll(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: WorkflowStatus,
    @Query('isActive') isActive?: string,
    @Query('createdBy') createdBy?: string,
  ) {
    const options = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      status,
      isActive: isActive ? isActive === 'true' : undefined,
      createdBy: createdBy || (req.user.isAdmin ? undefined : req.user.sub),
    };
    return this.workflowsService.findAll(options);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by ID' })
  @ApiResponse({ status: 200, description: 'Workflow retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async findOne(@Param('id') id: string): Promise<WorkflowResponseDto> {
    const workflow = await this.workflowsService.findOne(id);
    return this.workflowsService['mapToResponseDto'](workflow);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow updated successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<WorkflowResponseDto> {
    return this.workflowsService.update(id, updateWorkflowDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deleted successfully' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async remove(@Param('id') id: string): Promise<{ message: string }> {
    await this.workflowsService.remove(id);
    return { message: 'Workflow deleted successfully' };
  }

  @Post(':id/activate')
  @ApiOperation({ summary: 'Activate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow activated successfully' })
  async activate(@Param('id') id: string): Promise<WorkflowResponseDto> {
    return this.workflowsService.activate(id);
  }

  @Post(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow deactivated successfully' })
  async deactivate(@Param('id') id: string): Promise<WorkflowResponseDto> {
    return this.workflowsService.deactivate(id);
  }

  @Post(':id/execute')
  @ApiOperation({ summary: 'Execute a workflow' })
  @ApiResponse({ status: 200, description: 'Workflow executed successfully' })
  async execute(
    @Param('id') id: string,
    @Body() executionDto: WorkflowExecutionDto,
  ) {
    return this.workflowsService.executeWorkflow(id, executionDto);
  }
}