import { Injectable, OnModuleInit } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { CustomFieldDefinition } from '../../database/entities/custom-field-definition.entity';
import { CustomFieldsEvents } from './custom-fields.events';

// Maps our field types to SQL casts used in the dynamic view.
// We keep all as text for simplicity and compatibility; can be specialized per type later.
function sqlExprForField(key: string): string {
  // Safely reference JSONB key and cast to text. Arrays collapse to a comma-joined string by default jsonb ->> cast.
  // For better array handling later, we can use jsonb_array_elements_text.
  const escaped = key.replace(/'/g, "''");
  return `(l.custom_data->> '${escaped}')`;
}

function toIdentifier(name: string): string {
  // Build a safe SQL identifier: cf_<slug> (lowercase, alnum + underscore)
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const prefixed = `cf_${base || 'field'}`;
  // Ensure starts with a letter to be a valid identifier
  return /^[a-z_]/.test(prefixed) ? prefixed : `cf_${prefixed}`;
}

@Injectable()
export class SchemaSyncService implements OnModuleInit {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CustomFieldDefinition)
    private readonly defsRepo: Repository<CustomFieldDefinition>,
    private readonly events: CustomFieldsEvents,
  ) {}

  async onModuleInit() {
    // Build or refresh the dynamic view at boot.
    try {
      await this.rebuildLeadsView();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('Leads dynamic view build skipped:', (e as any)?.message || e);
    }

    // Rebuild on every definition change. In a larger system, debounce/throttle as needed.
    this.events.stream().subscribe(async (evt) => {
      if (evt.entityType !== 'lead') return;
      try {
        await this.rebuildLeadsView();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to rebuild leads dynamic view:', (e as any)?.message || e);
      }
    });
  }

  async rebuildLeadsView() {
    // Read all ACTIVE lead custom fields across centers to project as columns
    const defs = await this.defsRepo.find({
      where: { entityType: 'lead' as any, active: true },
      order: { order: 'ASC', dateEntered: 'ASC' } as any,
    });

    // Build select list: choose a minimal set of core columns plus dynamic custom ones
    const coreCols = [
      'l.id',
      'l.date_entered',
      'l.date_modified',
      'l.assigned_user_id',
      'l.lead_status',
    ];

    const dynamicCols: string[] = [];
    const usedNames = new Set<string>();

    for (const d of defs) {
      const ident = toIdentifier(d.key);
      // Avoid duplicate identifiers if keys collide
      const unique = usedNames.has(ident) ? `${ident}_${d.id.substring(0, 8)}` : ident;
      usedNames.add(unique);
      dynamicCols.push(`${sqlExprForField(d.key)} AS ${unique}`);
    }

    const selectList = [...coreCols, ...dynamicCols].join(',\n  ');

  const createOrReplaceSql = `CREATE OR REPLACE VIEW public.leads_dynamic AS\nSELECT\n  ${selectList}\nFROM public.leads l;`;
  const dropViewSql = `DROP VIEW IF EXISTS public.leads_dynamic CASCADE;`;
  const createSql = `CREATE VIEW public.leads_dynamic AS\nSELECT\n  ${selectList}\nFROM public.leads l;`;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    try {
      // First attempt a CREATE OR REPLACE. If column rename conflicts occur, drop and recreate.
      try {
        await queryRunner.query(createOrReplaceSql);
      } catch (e) {
        const msg = (e as any)?.message || String(e);
        const renameConflict = /cannot change name of view column/i.test(msg);
        if (renameConflict) {
          // eslint-disable-next-line no-console
          console.warn('leads_dynamic view rename conflict detected; recreating view');
          await queryRunner.query(dropViewSql);
          await queryRunner.query(createSql);
        } else {
          throw e;
        }
      }
    } finally {
      await queryRunner.release();
    }
  }
}
