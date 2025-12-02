import { IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export const ENTITY_TYPES = ['lead'] as const;
export type EntityType = typeof ENTITY_TYPES[number];

export const FIELD_TYPES = ['text', 'textarea', 'number', 'date', 'boolean', 'select', 'multiselect'] as const;
export type FieldType = typeof FIELD_TYPES[number];

export class CreateCustomFieldDefinitionDto {
	@IsIn(ENTITY_TYPES as unknown as string[])
	entityType: EntityType;

	@IsString()
	@IsNotEmpty()
	@MaxLength(128)
	name: string;

	@IsString()
	@IsOptional()
	@MaxLength(128)
	key?: string; // optional; will be generated from name if not provided

		@IsString()
		@IsOptional()
		@MaxLength(128)
		groupName?: string;

		@IsOptional()
		@IsBoolean()
		isSystem?: boolean = false;

		@IsOptional()
		@IsString()
		@MaxLength(128)
		targetField?: string;

	@IsIn(FIELD_TYPES as unknown as string[])
	fieldType: FieldType;

	@IsOptional()
	@IsArray()
	options?: Array<{ label: string; value: string } | string>;

	@IsBoolean()
	@IsOptional()
	required?: boolean = false;

	@IsInt()
	@Min(0)
	@IsOptional()
	order?: number = 0;

	@IsString()
	@IsOptional()
	@MaxLength(255)
	helpText?: string;

	@IsOptional()
	defaultValue?: any;

	@IsBoolean()
	@IsOptional()
	active?: boolean = true;
}

export class UpdateCustomFieldDefinitionDto {
	@IsOptional()
	@IsString()
	@MaxLength(128)
	name?: string;

	@IsOptional()
	@IsString()
	@MaxLength(128)
	key?: string;

	@IsOptional()
	@IsIn(FIELD_TYPES as unknown as string[])
	fieldType?: FieldType;

	@IsOptional()
	@IsArray()
	options?: Array<{ label: string; value: string } | string>;

	@IsOptional()
	@IsBoolean()
	required?: boolean;

	@IsOptional()
	@IsInt()
	@Min(0)
	order?: number;

		@IsOptional()
		@IsString()
		@MaxLength(128)
		groupName?: string;

		@IsOptional()
		@IsBoolean()
		isSystem?: boolean;

		@IsOptional()
		@IsString()
		@MaxLength(128)
		targetField?: string;

	@IsOptional()
	@IsString()
	@MaxLength(255)
	helpText?: string;

	@IsOptional()
	defaultValue?: any;

	@IsOptional()
	@IsBoolean()
	active?: boolean;
}

export class SaveCustomFieldValuesDto {
	@IsIn(ENTITY_TYPES as unknown as string[])
	entityType: EntityType;

	@IsUUID()
	recordId: string;

	@IsObject()
	values: Record<string, any>; // key:value map by definition.key
}

