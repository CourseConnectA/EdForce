import { 
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	OneToMany,
	Index,
} from 'typeorm';
import { CustomFieldValue } from './custom-field-value.entity';

export type CustomEntityType = 'lead' | 'opportunity' | 'contact';
export type CustomFieldType =
	| 'text'
	| 'textarea'
	| 'number'
	| 'date'
	| 'boolean'
	| 'select'
	| 'multiselect';

@Entity('custom_field_definitions')
@Index(['entityType', 'centerName', 'key'], { unique: true })
export class CustomFieldDefinition {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'entity_type', type: 'varchar', length: 32 })
	entityType: CustomEntityType;

	@Column({ type: 'varchar', length: 128 })
	name: string; // Human readable label

	@Column({ type: 'varchar', length: 128 })
	key: string; // Machine name (slug), unique per entity type

	@Column({ name: 'field_type', type: 'varchar', length: 32 })
	fieldType: CustomFieldType;

	@Column({ type: 'jsonb', nullable: true })
	options?: Array<{ label: string; value: string } | string>; // For select types

	@Column({ type: 'boolean', default: false })
	required: boolean;

	@Column({ type: 'int', default: 0 })
	order: number;

		@Column({ name: 'group_name', type: 'varchar', length: 128, nullable: true })
		groupName?: string; // Logical grouping/section name used in UI

		@Column({ name: 'is_system', type: 'boolean', default: false })
		isSystem: boolean; // true for built-in fields (firstName, lastName...)

		@Column({ name: 'target_field', type: 'varchar', length: 128, nullable: true })
		targetField?: string; // For system fields: the actual column/property name on the entity

	@Column({ name: 'help_text', type: 'varchar', length: 255, nullable: true })
	helpText?: string;

	@Column({ name: 'default_value', type: 'jsonb', nullable: true })
	defaultValue?: any;

	@Column({ type: 'boolean', default: true })
	active: boolean;

	// Scope definitions per center (Center Manager's center)
	@Column({ name: 'center_name', type: 'varchar', length: 150, nullable: true })
	centerName?: string | null;

	@CreateDateColumn({ name: 'date_entered' })
	dateEntered: Date;

	@UpdateDateColumn({ name: 'date_modified' })
	dateModified: Date;

	@OneToMany(() => CustomFieldValue, (value) => value.field)
	values: CustomFieldValue[];
}

