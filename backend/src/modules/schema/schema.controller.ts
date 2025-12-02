import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SchemaService } from './schema.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('schema')
@Controller('schema')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class SchemaController {
  constructor(private readonly schemaService: SchemaService) {}

  @Get('leads')
  @ApiOperation({ summary: 'List columns for public.leads' })
  async getLeadsTable() {
    const columns = await this.schemaService.getTableColumns('leads', 'public');
    return { table: 'public.leads', columns };
  }

  @Get('leads-dynamic')
  @ApiOperation({ summary: 'Dynamic leads view removed' })
  async getLeadsDynamicView() {
    return { view: 'public.leads_dynamic', exists: false, columns: [] };
  }
}
