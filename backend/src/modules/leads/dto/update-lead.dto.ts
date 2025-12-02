import { PartialType } from '@nestjs/swagger';
import { CreateLeadDto } from './create-lead.dto';
import { IsInt, Max, Min, IsOptional, IsString } from 'class-validator';

export class UpdateLeadDto extends PartialType(CreateLeadDto) {
	// Allow updating score explicitly
	@IsOptional()
	@IsInt()
	@Min(0)
	@Max(100)
	leadScorePercent?: number;

	// For counselor restriction enforcement, we still validate types
	@IsOptional()
	@IsString()
	referenceNo?: string; // Will be ignored if attempted to change
}