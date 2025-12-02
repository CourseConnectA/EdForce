import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CustomFieldsService } from './custom-fields.service';
import { CreateCustomFieldDefinitionDto, SaveCustomFieldValuesDto, UpdateCustomFieldDefinitionDto } from './dto/custom-fields.dto';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';

@ApiTags('custom-fields')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('custom-fields')
export class CustomFieldsController {
	constructor(private readonly service: CustomFieldsService) {}

		@Get('definitions')
		@ApiOperation({ summary: 'List custom field definitions for an entity type' })
		@ApiQuery({ name: 'entityType', required: true, enum: ['lead'] })
		@ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
		listDefinitions(
			@Query('entityType') entityType: 'lead',
			@Query('includeInactive') includeInactive?: string,
			@Req() req?: any,
		) {
		const include = includeInactive === 'true' || includeInactive === '1';
		return this.service.listDefinitions(entityType, include, req?.user);
	}

		@Get('groups')
		@ApiOperation({ summary: 'List custom field groups for an entity type' })
		@ApiQuery({ name: 'entityType', required: true, enum: ['lead'] })
		@ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
		async listGroups(@Query('entityType') entityType: 'lead', @Query('includeInactive') includeInactive?: string, @Req() req?: any) {
			const include = includeInactive === 'true' || includeInactive === '1';
			const defs = await this.service.listDefinitions(entityType, include, req?.user);
			const groups = new Map<string, { name: string; fields: any[] }>();
			for (const d of defs) {
				const name = d.groupName || 'Default';
				if (!groups.has(name)) groups.set(name, { name, fields: [] });
				groups.get(name)!.fields.push(d);
			}
			return Array.from(groups.values());
		}


	@Post('definitions')
	@ApiOperation({ summary: 'Create a custom field definition' })
	@Roles('center-manager')
	createDefinition(@Body() dto: CreateCustomFieldDefinitionDto, @Req() req: any) {
		return this.service.createDefinition(dto, req.user);
	}

	@Patch('definitions/:id')
	@ApiOperation({ summary: 'Update a custom field definition' })
	@Roles('center-manager')
	updateDefinition(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCustomFieldDefinitionDto, @Req() req: any) {
		return this.service.updateDefinition(id, dto, req.user);
	}

	@Delete('definitions/:id')
	@ApiOperation({ summary: 'Delete a custom field definition' })
	@Roles('center-manager')
	deleteDefinition(@Param('id', ParseUUIDPipe) id: string, @Req() req: any) {
		return this.service.deleteDefinition(id, req.user);
	}

	@Post('values')
	@ApiOperation({ summary: 'Save custom field values for a record' })
	saveValues(@Body() dto: SaveCustomFieldValuesDto) {
		return this.service.saveValues(dto);
	}

		@Get('values')
		@ApiOperation({ summary: 'Get custom field values for a record' })
		@ApiQuery({ name: 'entityType', required: true, enum: ['lead'] })
		@ApiQuery({ name: 'recordId', required: true })
		getValues(
			@Query('entityType') entityType: 'lead',
			@Query('recordId') recordId: string,
		) {
		return this.service.getValues(entityType, recordId);
	}
}

