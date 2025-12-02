import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { FileInterceptor } from '@nestjs/platform-express';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
    return this.leadsService.create(createLeadDto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all leads with pagination and filtering' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findAll(@Query() query: LeadQueryDto, @Req() req: any) {
    return this.leadsService.findAll(query, req.user);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get lead statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getStatistics(@Req() req: any) {
    return this.leadsService.getLeadStatistics(req.user);
  }

  // Field settings
  @Get('field-settings')
  @ApiOperation({ summary: 'List lead field visibility/required settings' })
  listFieldSettings() {
    return this.leadsService.getFieldSettings();
  }

  @Patch('field-settings')
  @ApiOperation({ summary: 'Update lead field settings (visible/required) in bulk' })
  updateFieldSettings(@Body() body: { settings: Array<{ key: string; visible?: boolean; required?: boolean }> }) {
    if (!body || !Array.isArray(body.settings)) {
      throw new BadRequestException('settings array required');
    }
    return this.leadsService.saveFieldSettings(body.settings);
  }

  @Post('import-csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Import leads via CSV (multipart/form-data, field name: file)' })
  @ApiResponse({ status: 201, description: 'Import result' })
  importCsv(@UploadedFile() file: Express.Multer.File, @Req() req: any) {
    if (!file?.buffer) {
      throw new BadRequestException('CSV file is required');
    }
    return this.leadsService.importCsv(file.buffer, req.user);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search leads by name, company, or email' })
  @ApiResponse({ status: 200, description: 'Search results retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ name: 'q', description: 'Search term' })
  @ApiQuery({ name: 'limit', description: 'Maximum number of results', required: false })
  searchLeads(
    @Query('q') searchTerm: string,
    @Query('limit') limit: string = '10',
    @Req() req: any,
  ) {
    return this.leadsService.searchLeads(searchTerm, parseInt(limit), req.user);
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get leads by status' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLeadsByStatus(
    @Param('status') status: string,
    @Query() query: LeadQueryDto,
    @Req() req: any,
  ) {
    return this.leadsService.getLeadsByStatus(status, query, req.user);
  }

  @Get('by-source/:source')
  @ApiOperation({ summary: 'Get leads by lead source' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getLeadsBySource(
    @Param('source') leadSource: string,
    @Query() query: LeadQueryDto,
    @Req() req: any,
  ) {
    return this.leadsService.getLeadsBySource(leadSource, query, req.user);
  }

  // Lead Views
  @Get('views')
  @ApiOperation({ summary: 'List my lead views' })
  listViews(@Req() req: any) {
    return this.leadsService.listViews(req.user);
  }

  @Post('views')
  @ApiOperation({ summary: 'Create a lead view' })
  createView(@Body() body: any, @Req() req: any) {
    return this.leadsService.createView(body, req.user);
  }

  @Patch('views/:id')
  @ApiOperation({ summary: 'Update a lead view' })
  updateView(@Param('id', ParseUUIDPipe) id: string, @Body() body: any, @Req() req: any) {
    return this.leadsService.updateView(id, body, req.user);
  }

  @Delete('views/:id')
  @ApiOperation({ summary: 'Delete a lead view' })
  removeView(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.leadsService.removeView(id, req.user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.leadsService.findOne(id, req.user);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get lead history by ID' })
  @ApiResponse({ status: 200, description: 'Lead history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getHistory(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.leadsService.getHistory(id, req.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a lead' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @Req() req: any,
  ) {
    return this.leadsService.update(id, updateLeadDto, req.user);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Assign/reassign a lead to a counselor (center manager only)' })
  assignLead(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { assignedUserId: string },
    @Req() req: any,
  ) {
    if (!body?.assignedUserId) throw new BadRequestException('assignedUserId is required');
    return this.leadsService.assignLead(id, body.assignedUserId, req.user);
  }

  @Patch('assign-bulk')
  @ApiOperation({ summary: 'Bulk assign leads to a counselor (center manager only)' })
  assignLeadsBulk(
    @Body() body: { ids: string[]; assignedUserId: string },
    @Req() req: any,
  ) {
    if (!body?.assignedUserId || !Array.isArray(body?.ids)) throw new BadRequestException('assignedUserId and ids[] are required');
    return this.leadsService.assignLeadsBulk(body.ids, body.assignedUserId, req.user);
  }

  @Patch(':id/convert')
  @ApiOperation({ summary: 'Convert a lead to customer' })
  @ApiResponse({ status: 200, description: 'Lead converted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  convertLead(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.leadsService.convertLead(id, req.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a lead' })
  @ApiResponse({ status: 200, description: 'Lead deleted successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
    return this.leadsService.remove(id, req.user);
  }

  @Post('delete-bulk')
  @ApiOperation({ summary: 'Bulk delete leads' })
  @ApiResponse({ status: 200, description: 'Bulk delete completed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  removeBulk(@Body() body: { ids: string[] }, @Req() req: any) {
    if (!Array.isArray(body?.ids) || body.ids.length === 0) {
      throw new BadRequestException('ids[] array is required');
    }
    return this.leadsService.removeBulk(body.ids, req.user);
  }
}