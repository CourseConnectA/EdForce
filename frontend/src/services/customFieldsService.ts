import { apiService } from './apiService';

export type EntityType = 'lead' | 'opportunity' | 'contact';
export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select' | 'multiselect';

export interface CustomFieldDefinition {
	id: string;
	entityType: EntityType;
	name: string;
	key: string;
	fieldType: FieldType;
	options?: Array<{ label: string; value: string } | string>;
	required: boolean;
	order: number;
	groupName?: string;
	isSystem?: boolean;
	targetField?: string;
	helpText?: string;
	defaultValue?: any;
	active: boolean;
}

export interface CreateCustomFieldDefinitionDto {
	entityType: EntityType;
	name: string;
	key?: string;
	fieldType: FieldType;
	options?: Array<{ label: string; value: string } | string>;
	required?: boolean;
	order?: number;
	groupName?: string;
	isSystem?: boolean;
	targetField?: string;
	helpText?: string;
	defaultValue?: any;
	active?: boolean;
}

export interface UpdateCustomFieldDefinitionDto extends Partial<CreateCustomFieldDefinitionDto> {}

class CustomFieldsService {
	private basePath = '/custom-fields';

	async listDefinitions(entityType: EntityType, includeInactive = false): Promise<CustomFieldDefinition[]> {
		const include = includeInactive ? '&includeInactive=true' : '';
		const ts = `&_=${Date.now()}`; // cache-buster to avoid stale lists after mutations
		return apiService.get(`${this.basePath}/definitions?entityType=${entityType}${include}${ts}`);
	}

	async createDefinition(dto: CreateCustomFieldDefinitionDto): Promise<CustomFieldDefinition> {
		return apiService.post(`${this.basePath}/definitions`, dto);
	}

	async updateDefinition(id: string, dto: UpdateCustomFieldDefinitionDto): Promise<CustomFieldDefinition> {
		return apiService.patch(`${this.basePath}/definitions/${id}`, dto);
	}

	async deleteDefinition(id: string): Promise<void> {
		return apiService.delete(`${this.basePath}/definitions/${id}`);
	}

	async saveValues(entityType: EntityType, recordId: string, values: Record<string, any>): Promise<void> {
		return apiService.post(`${this.basePath}/values`, { entityType, recordId, values });
	}

	async getValues(entityType: EntityType, recordId: string): Promise<Record<string, any>> {
		return apiService.get(`${this.basePath}/values?entityType=${entityType}&recordId=${recordId}`);
	}

		async listGroups(entityType: EntityType, includeInactive = false): Promise<Array<{ name: string; fields: CustomFieldDefinition[] }>> {
			const include = includeInactive ? '&includeInactive=true' : '';
			return apiService.get(`${this.basePath}/groups?entityType=${entityType}${include}`);
		}

	async seedLeadSystemFields(): Promise<{ seeded: number }> {
		return apiService.post(`${this.basePath}/definitions/seed-system`);
	}
}

export const customFieldsService = new CustomFieldsService();
export default customFieldsService;

