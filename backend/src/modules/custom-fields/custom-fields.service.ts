import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomFieldDefinition } from '../../database/entities/custom-field-definition.entity';
import { CustomFieldValue } from '../../database/entities/custom-field-value.entity';
import { CreateCustomFieldDefinitionDto, UpdateCustomFieldDefinitionDto, SaveCustomFieldValuesDto } from './dto/custom-fields.dto';

function slugify(input: string): string {
	return input
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '')
		.slice(0, 120);
}

@Injectable()
export class CustomFieldsService {
	constructor(
		@InjectRepository(CustomFieldDefinition)
		private readonly defRepo: Repository<CustomFieldDefinition>,
		@InjectRepository(CustomFieldValue)
		private readonly valRepo: Repository<CustomFieldValue>,
	) {}

	async listDefinitions(entityType: 'lead', includeInactive = false, user?: any): Promise<CustomFieldDefinition[]> {
		const where: any = { entityType };
		if (!includeInactive) where.active = true;
		// Scope by center: only definitions for the viewer's center
		const role = String(user?.role || (user?.isAdmin ? 'super-admin' : '')).toLowerCase();
		if (role === 'center-manager' || role === 'counselor') {
			where.centerName = user?.centerName || null;
		} else {
			// super-admin and others: per requirement, no access/empty
			return [];
		}
		return this.defRepo.find({ where, order: { order: 'ASC', dateEntered: 'ASC' } });
	}

	async createDefinition(dto: CreateCustomFieldDefinitionDto, user: any): Promise<CustomFieldDefinition> {
		const role = String(user?.role || (user?.isAdmin ? 'super-admin' : '')).toLowerCase();
		if (role !== 'center-manager') throw new ForbiddenException('Only Center Managers can create custom fields');
		const key = dto.key?.trim() || slugify(dto.name);
		if (!key) throw new BadRequestException('Unable to derive a valid key from name');

		const existing = await this.defRepo.findOne({ where: { entityType: dto.entityType, key, centerName: user?.centerName || null } });
		if (existing) throw new BadRequestException(`Field key '${key}' already exists for ${dto.entityType}`);

			// Normalize options for select types
			let normalizedOptions: any = undefined;
			if (dto.fieldType === 'select' || dto.fieldType === 'multiselect') {
				if (Array.isArray(dto.options)) {
					normalizedOptions = dto.options.map((o: any) =>
						typeof o === 'string'
							? { label: o, value: o }
							: { label: String(o.label ?? o.value ?? '').trim(), value: String(o.value ?? o.label ?? '').trim() }
					).filter((o: any) => o.label && o.value);
				} else {
					normalizedOptions = [];
				}
			} else {
				normalizedOptions = null;
			}

			const def = this.defRepo.create({
				...dto,
				options: normalizedOptions,
				key,
				isSystem: !!dto.isSystem,
				groupName: dto.groupName?.trim() || undefined,
				targetField: dto.targetField?.trim() || undefined,
				centerName: user?.centerName || null,
			});
		return this.defRepo.save(def);
	}

	async updateDefinition(id: string, dto: UpdateCustomFieldDefinitionDto, user?: any): Promise<CustomFieldDefinition> {
		const def = await this.defRepo.findOne({ where: { id } });
		if (!def) throw new NotFoundException('Custom field not found');
		if (user) {
			const role = String(user?.role || (user?.isAdmin ? 'super-admin' : '')).toLowerCase();
			if (role !== 'center-manager' || def.centerName !== user?.centerName) {
				throw new ForbiddenException('Not allowed to modify this custom field');
			}
		}

		if (dto.key) {
			const exists = await this.defRepo.findOne({ where: { entityType: def.entityType, key: dto.key } });
			if (exists && exists.id !== id) throw new BadRequestException(`Field key '${dto.key}' already exists`);
		}

			// Prevent accidental key change for system fields unless explicitly passed
			if (def.isSystem && dto.key && dto.key !== def.key) {
				throw new BadRequestException('Cannot change key of a system field');
			}
			// Normalize options changes
			const next: any = { ...dto };
			const nextFieldType = dto.fieldType ?? def.fieldType;
			if (nextFieldType === 'select' || nextFieldType === 'multiselect') {
				if (dto.options !== undefined) {
					next.options = Array.isArray(dto.options)
						? dto.options.map((o: any) => typeof o === 'string'
							? { label: o, value: o }
							: { label: String(o.label ?? o.value ?? '').trim(), value: String(o.value ?? o.label ?? '').trim() }
						  ).filter((o: any) => o.label && o.value)
						: [];
				}
			} else {
				// If field type switches away from select types, clear options
				if (dto.fieldType) {
					next.options = null;
				}
			}

			Object.assign(def, next, {
				groupName: next.groupName?.trim() || next.groupName === '' ? next.groupName?.trim() : def.groupName,
				targetField: next.targetField?.trim() || next.targetField === '' ? next.targetField?.trim() : def.targetField,
			});
		return this.defRepo.save(def);
	}

	async deleteDefinition(id: string, user?: any): Promise<void> {
		const def = await this.defRepo.findOne({ where: { id } });
		if (!def) throw new NotFoundException('Custom field not found');
		if (user) {
			const role = String(user?.role || (user?.isAdmin ? 'super-admin' : '')).toLowerCase();
			if (role !== 'center-manager' || def.centerName !== user?.centerName) {
				throw new ForbiddenException('Not allowed to delete this custom field');
			}
		}
		await this.defRepo.remove(def);
	}

	async saveValues(dto: SaveCustomFieldValuesDto): Promise<void> {
		// Load all definitions for the entity type to validate keys
		const defs = await this.defRepo.find({ where: { entityType: dto.entityType, active: true } });
		const defsByKey = new Map(defs.map((d) => [d.key, d] as const));

		const ops: CustomFieldValue[] = [];
		for (const [key, val] of Object.entries(dto.values || {})) {
			const def = defsByKey.get(key);
			if (!def) continue; // skip unknown keys silently

			// Simple type coercion/validation for basic types
			let value: any = val;
			switch (def.fieldType) {
				case 'number':
					if (value === '' || value === null || value === undefined) value = null;
					else {
						const n = Number(value);
						if (isNaN(n)) throw new BadRequestException(`Value for ${def.name} must be a number`);
						value = n;
					}
					break;
				case 'boolean':
					value = Boolean(value);
					break;
				case 'date':
					if (value) {
						const d = new Date(value);
						if (isNaN(d.getTime())) throw new BadRequestException(`Value for ${def.name} must be a valid date`);
						// store as ISO date string
						value = d.toISOString();
					} else value = null;
					break;
				case 'multiselect':
					if (!Array.isArray(value)) value = value ? [value] : [];
					break;
				default:
					// text, textarea, select: ensure string
					if (value !== null && value !== undefined && typeof value !== 'string') value = String(value);
			}

			const existing = await this.valRepo.findOne({ where: { entityType: dto.entityType, recordId: dto.recordId, field: { id: def.id } } });

			if (existing) {
				existing.value = value;
				ops.push(existing);
			} else {
				const newVal = this.valRepo.create({
					entityType: dto.entityType,
					recordId: dto.recordId,
					field: def,
					value,
				});
				ops.push(newVal);
			}
		}

		if (ops.length) {
			await this.valRepo.save(ops);
		}
	}

	async getValues(entityType: 'lead', recordId: string): Promise<Record<string, any>> {
			const values = await this.valRepo.find({ where: { entityType, recordId }, relations: ['field'] });
			const out: Record<string, any> = {};
			for (const v of values) {
				out[v.field.key] = {
					value: v.value,
					fieldId: v.field.id,
					fieldType: v.field.fieldType,
					isSystem: v.field.isSystem,
					groupName: v.field.groupName,
				};
			}
			return out;
	}

		// seedSystemLeadFields removed: dynamic lead fields are no longer supported
}

