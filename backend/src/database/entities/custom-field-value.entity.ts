import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	ManyToOne,
	JoinColumn,
	Index,
	CreateDateColumn,
	UpdateDateColumn,
} from 'typeorm';
import { CustomFieldDefinition, CustomEntityType } from './custom-field-definition.entity';

@Entity('custom_field_values')
@Index(['entityType', 'recordId', 'field'], { unique: true })
export class CustomFieldValue {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({ name: 'entity_type', type: 'varchar', length: 32 })
	entityType: CustomEntityType; // e.g. 'lead', 'opportunity', 'contact'

	@Column({ name: 'record_id', type: 'uuid' })
	recordId: string; // ID of the record in its table

	@ManyToOne(() => CustomFieldDefinition, (def) => def.values, { eager: true, onDelete: 'CASCADE' })
	@JoinColumn({ name: 'field_id' })
	field: CustomFieldDefinition;

	@Column({ type: 'jsonb', nullable: true })
	value?: any; // Store value as JSON to support multiple types

	@CreateDateColumn({ name: 'date_entered' })
	dateEntered: Date;

	@UpdateDateColumn({ name: 'date_modified' })
	dateModified: Date;
}

