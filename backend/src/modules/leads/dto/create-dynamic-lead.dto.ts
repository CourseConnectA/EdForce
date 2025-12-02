import { IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDynamicLeadDto {
  @ApiProperty({ description: 'Key-value map of field values by definition key', example: { first_name: 'John', fig: '42' } })
  @IsObject()
  values: Record<string, any>;
}
