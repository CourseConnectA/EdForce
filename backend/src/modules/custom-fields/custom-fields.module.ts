import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldsController } from './custom-fields.controller';
import { CustomFieldDefinition } from '../../database/entities/custom-field-definition.entity';
import { CustomFieldValue } from '../../database/entities/custom-field-value.entity';
import { CustomFieldsEvents } from './custom-fields.events';
import { Lead } from '../../database/entities/lead.entity';

@Module({
	imports: [TypeOrmModule.forFeature([CustomFieldDefinition, CustomFieldValue, Lead])],
	controllers: [CustomFieldsController],
	providers: [CustomFieldsService, CustomFieldsEvents],
	exports: [CustomFieldsService, CustomFieldsEvents],
})
export class CustomFieldsModule {}

