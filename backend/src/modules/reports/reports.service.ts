import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Report } from '../../database/entities/report.entity';
import { ReportFolder } from '../../database/entities/report-folder.entity';
import { Lead } from '../../database/entities/lead.entity';
import { LeadHistory } from '../../database/entities/lead-history.entity';
import { User } from '../../database/entities/user.entity';
import { normalizeRole } from '../../common/role.util';

type Pagination = { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC'|'DESC' };

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private reportRepo: Repository<Report>,
    @InjectRepository(ReportFolder) private folderRepo: Repository<ReportFolder>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(LeadHistory) private historyRepo: Repository<LeadHistory>,
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  // Folders
  listFolders(user: any) {
    const centerName = user?.centerName || null;
    return this.folderRepo.find({ where: { centerName } as any, order: { name: 'ASC' as any } });
  }

  createFolder(user: any, data: { name: string; description?: string }) {
    if (!data?.name) throw new BadRequestException('name required');
    const folder = this.folderRepo.create({ name: data.name, description: data?.description || null, centerName: user?.centerName || null, createdBy: user?.id || null });
    return this.folderRepo.save(folder);
  }

  async updateFolder(user: any, id: string, data: { name?: string; description?: string }) {
    const folder = await this.folderRepo.findOne({ where: { id } as any });
    if (!folder) throw new BadRequestException('Folder not found');
    const role = normalizeRole(user?.role, user?.isAdmin);
    const isCreator = folder.createdBy && folder.createdBy === user?.id;
    const isSuper = role === 'super-admin';
    if (!isCreator && !isSuper) throw new ForbiddenException('No permission to modify folder');
    Object.assign(folder, { name: data?.name ?? folder.name, description: data?.description ?? folder.description });
    return this.folderRepo.save(folder);
  }

  async deleteFolder(user: any, id: string) {
    const folder = await this.folderRepo.findOne({ where: { id } as any });
    if (!folder) return { ok: true };
    const role = normalizeRole(user?.role, user?.isAdmin);
    const isCreator = folder.createdBy && folder.createdBy === user?.id;
    const isSuper = role === 'super-admin';
    if (!isCreator && !isSuper) throw new ForbiddenException('No permission to delete folder');
    // Move reports to no-folder on delete
    await this.reportRepo.createQueryBuilder().update(Report).set({ folderId: null } as any).where('folder_id = :id', { id }).execute();
    await this.folderRepo.remove(folder);
    return { ok: true };
  }

  // Reports CRUD
  async createReport(user: any, body: Partial<Report>) {
    if (!body?.name || !body?.reportType) throw new BadRequestException('name and reportType required');
    const scope: 'personal' | 'center' = body?.scope === 'center' ? 'center' : 'personal';
    const report = this.reportRepo.create({
      name: body.name,
      description: body?.description || null,
      folderId: body?.folderId || null,
      reportType: String(body.reportType).toLowerCase(),
      config: body?.config || {},
      scope,
      centerName: scope === 'center' ? (user?.centerName || null) : null,
      createdBy: user?.id,
      starredBy: [],
    } as any);
    return this.reportRepo.save(report);
  }

  async updateReport(user: any, id: string, body: Partial<Report>) {
    const r = await this.reportRepo.findOne({ where: { id } as any });
    if (!r) throw new BadRequestException('Report not found');
    const role = normalizeRole(user?.role, user?.isAdmin);
    const own = r.createdBy === user?.id || (role === 'center-manager' && r.centerName === (user?.centerName || null));
    if (!own) throw new ForbiddenException('No permission');
    Object.assign(r, {
      name: body?.name ?? r.name,
      description: body?.description ?? r.description,
      folderId: body?.folderId ?? r.folderId,
      config: body?.config ?? r.config,
    });
    return this.reportRepo.save(r);
  }

  async getReport(user: any, id: string) {
    const r = await this.reportRepo.findOne({ where: { id } as any });
    if (!r) throw new BadRequestException('Report not found');
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'super-admin') return r;
    const centerMatch = (r.centerName || null) === (user?.centerName || null);
    const sharedDirectly = Array.isArray(r.sharedTo) && r.sharedTo.includes(user?.id);

    if (role === 'center-manager') {
      // Allow center managers to open any report template of supported types;
      // runtime scoping in queries ensures they only see their center's data.
      const isTemplateType = ['leads', 'lead_history'].includes(String(r.reportType || '').toLowerCase());
      const allowed = r.createdBy === user?.id || centerMatch || sharedDirectly || isTemplateType;
      if (!allowed) throw new ForbiddenException('No permission');
      return r;
    }

    if (role === 'counselor') {
      const excluded = Array.isArray((r as any).excludedFromCenter) && (r as any).excludedFromCenter.includes(user?.id);
      const allowed = r.createdBy === user?.id || ((r.scope === 'center' && centerMatch) && !excluded) || sharedDirectly;
      if (!allowed) throw new ForbiddenException('No permission');
      return r;
    }

    // default: creator or direct share
    const allowed = r.createdBy === user?.id || sharedDirectly;
    if (!allowed) throw new ForbiddenException('No permission');
    return r;
  }

  async deleteReport(user: any, id: string) {
    const r = await this.reportRepo.findOne({ where: { id } as any });
    if (!r) return { ok: true };
    const role = normalizeRole(user?.role, user?.isAdmin);
    const own = r.createdBy === user?.id || (role === 'center-manager' && r.centerName === (user?.centerName || null));
    if (!own) throw new ForbiddenException('No permission');
    await this.reportRepo.remove(r);
    return { ok: true };
  }

  async starReport(user: any, id: string, starred: boolean) {
    const r = await this.reportRepo.findOne({ where: { id } as any });
    if (!r) throw new BadRequestException('Report not found');
    const set = new Set(r.starredBy || []);
    if (starred) set.add(user?.id); else set.delete(user?.id);
    r.starredBy = Array.from(set);
    await this.reportRepo.save(r);
    return { starred: r.starredBy?.includes(user?.id) };
  }

  async listReports(user: any, q: { search?: string; category?: string; createdByMe?: boolean; sharedWithMe?: boolean; all?: boolean }, p: Pagination) {
    const role = normalizeRole(user?.role, user?.isAdmin);
    const qb = this.reportRepo.createQueryBuilder('r');
    // Scope: if all=true, list all reports metadata regardless of owner/scope
    if (!q?.all) {
      if (role === 'super-admin') {
        // all
      } else if (role === 'center-manager') {
        qb.where(`(
          (r.scope = :personal AND r.created_by = :uid) OR 
          (r.scope = :center AND r.center_name = :center) OR 
          (r.shared_to IS NOT NULL AND :uid::text = ANY(r.shared_to))
        )`, { personal: 'personal', uid: user?.id, center: user?.centerName || null });
      } else {
        // counselor: personal, center of own center (not excluded), or shared directly
        qb.where(`(
          (r.scope = :personal AND r.created_by = :uid) OR 
          (r.scope = :center AND r.center_name = :center AND (r.excluded_from_center IS NULL OR NOT (:uid::text = ANY(r.excluded_from_center)))) OR 
          (r.shared_to IS NOT NULL AND :uid::text = ANY(r.shared_to))
        )`, { personal: 'personal', uid: user?.id, center: user?.centerName || null });
      }
    }
  if (q?.search) qb.andWhere('LOWER(r.name) LIKE LOWER(:s)', { s: `%${q.search}%` });
  // Treat category as folderId for now
  if (q?.category) qb.andWhere('r.folder_id = :folderId', { folderId: q.category });
    if (q?.createdByMe) qb.andWhere('r.created_by = :uid', { uid: user?.id });
    // sharedWithMe placeholder: using center scope as shared for now
    if (q?.sharedWithMe) qb.andWhere('((r.scope = :center AND r.center_name = :center AND (r.excluded_from_center IS NULL OR NOT (:uid::text = ANY(r.excluded_from_center)))) OR (r.shared_to IS NOT NULL AND :uid::text = ANY(r.shared_to)))', { center: user?.centerName || null, uid: user?.id });

    const page = Math.max(1, p?.page || 1);
    const limit = Math.min(100, Math.max(10, p?.limit || 25));
    const offset = (page - 1) * limit;
    const sortBy = (p?.sortBy || 'dateModified');
    const order: 'ASC'|'DESC' = (p?.sortOrder || 'DESC');
    const allowed = new Set(['name','dateEntered','dateModified']);
    if (allowed.has(sortBy)) qb.orderBy(`r.${sortBy}`, order);
    else qb.orderBy('r.dateModified', 'DESC');
    qb.skip(offset).take(limit);
    const [rows, total] = await qb.getManyAndCount();
    // attach creator details
    const ids = Array.from(new Set(rows.map(r => r.createdBy))).filter(Boolean) as string[];
    const users = ids.length ? await this.userRepo.findByIds(ids as any) : [];
    const uMap = new Map<string, any>(users.map(u => [u.id, u]));
    const enriched = rows.map((r) => {
      const u = uMap.get(r.createdBy);
      const role = normalizeRole(u?.role, (u as any)?.isAdmin);
      const type = role === 'super-admin' ? 'admin' : role;
      const center = role === 'super-admin' ? null : (u?.centerName || null);
      const first = (u as any)?.firstName || (u as any)?.fullName || (u as any)?.name || (u as any)?.email || r.createdBy;
      return Object.assign(r, {
        createdByName: first,
        createdByFirstName: first,
        createdByType: type,
        createdByCenter: center,
      } as any);
    });
    return { data: enriched, total, page, limit };
  }

  async shareReport(user: any, id: string, body: { target: 'center' | 'user'; userId?: string; unshare?: boolean }) {
    const r = await this.reportRepo.findOne({ where: { id } as any });
    if (!r) throw new BadRequestException('Report not found');
    const role = normalizeRole(user?.role, user?.isAdmin);
    const own = r.createdBy === user?.id || role === 'super-admin';
    if (!own) throw new ForbiddenException('No permission to share');

    if (body?.target === 'center') {
      if (role !== 'center-manager' && role !== 'super-admin') throw new ForbiddenException('Only center manager or super admin can share to center');
      if (body?.unshare) {
        r.scope = 'personal';
        r.centerName = null;
      } else {
        r.scope = 'center';
        r.centerName = role === 'super-admin' ? (r.centerName || (user?.centerName || null)) : (user?.centerName || null);
      }
      return this.reportRepo.save(r);
    }

    if (body?.target === 'user') {
      const uid = String(body?.userId || '');
      if (!uid) throw new BadRequestException('userId required');
      const target = await this.userRepo.findOne({ where: { id: uid } as any });
      if (!target) throw new BadRequestException('User not found');

      // Role/center rules
      if (role === 'counselor') {
        const ok = (target.role === 'center-manager' && target.centerName === (user?.centerName || null)) || (target as any).isAdmin === true;
        if (!ok) throw new ForbiddenException('Counselor can share to their center manager or super admin');
      } else if (role === 'center-manager') {
        const ok = (target.role === 'counselor' && target.centerName === (user?.centerName || null)) || (target as any).isAdmin === true;
        if (!ok) throw new ForbiddenException('Center manager can share to counselors of their center or super admin');
      } else if (role === 'super-admin') {
        const ok = target.role === 'center-manager';
        if (!ok) throw new ForbiddenException('Super admin can share to center managers');
      }

      // If report is center-shared and target is counselor of that center, toggle exclusion instead of direct share
      const sameCenter = (target.centerName || null) === (r.centerName || user?.centerName || null);
      if (r.scope === 'center' && target.role === 'counselor' && sameCenter) {
        const ex = new Set(r.excludedFromCenter || []);
        if (body?.unshare) ex.add(uid); else ex.delete(uid);
        r.excludedFromCenter = Array.from(ex);
        return this.reportRepo.save(r);
      }

      // Otherwise, use direct share list
      const set = new Set(r.sharedTo || []);
      if (body?.unshare) set.delete(uid); else set.add(uid);
      r.sharedTo = Array.from(set);
      return this.reportRepo.save(r);
    }

    throw new BadRequestException('Invalid share target');
  }

  // Fields by type
  getFieldsByType(type: string) {
    const t = String(type || '').toLowerCase();
    if (t === 'leads' || t === 'lead' || !t) {
      return [
        { key: 'id', label: 'Lead ID', category: 'Lead Fields' },
        { key: 'referenceNo', label: 'Reference No', category: 'Lead Fields' },
        { key: 'firstName', label: 'First Name', category: 'Lead Fields' },
        { key: 'lastName', label: 'Last Name', category: 'Lead Fields' },
        { key: 'email', label: 'Email', category: 'Lead Fields' },
        { key: 'mobileNumber', label: 'Mobile', category: 'Lead Fields' },
        { key: 'leadStatus', label: 'Lead Status', category: 'Lead Fields' },
        { key: 'leadSubStatus', label: 'Lead Sub Status', category: 'Lead Fields' },
        { key: 'program', label: 'Program', category: 'Program Fields' },
        { key: 'batch', label: 'Batch', category: 'Batch Fields' },
        { key: 'leadSource', label: 'Lead Source', category: 'Source Fields' },
        { key: 'locationCity', label: 'City', category: 'Lead Fields' },
        { key: 'locationState', label: 'State', category: 'Lead Fields' },
        { key: 'dateEntered', label: 'Created On', category: 'Lead Fields' },
        { key: 'dateModified', label: 'Updated On', category: 'Lead Fields' },
        { key: 'counselorName', label: 'Counselor Name', category: 'Lead Owner Fields' },
      ];
    }
    if (t === 'lead_history') {
      return [
        { key: 'leadId', label: 'Lead ID', category: 'Lead History' },
        { key: 'action', label: 'Action', category: 'Lead History' },
        { key: 'note', label: 'Note', category: 'Lead History' },
        { key: 'changedAt', label: 'Changed At', category: 'Lead History' },
      ];
    }
    return [];
  }

  // Build lead query per config
  private buildLeadsQuery(config: any, user: any): SelectQueryBuilder<Lead> {
    const qb = this.leadRepo.createQueryBuilder('lead').where('lead.deleted = :del', { del: false });
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'center-manager') {
      // Center managers see leads assigned to their center users OR
      // unassigned leads created by users in their center (consistent with list/findOne)
      qb.andWhere(
        `(lead.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName) OR 
          (lead.assignedUserId IS NULL AND lead.createdBy IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)))`,
        { centerName: user?.centerName || null }
      );
    } else if (role === 'counselor') {
      qb.andWhere('lead.assignedUserId = :uid', { uid: user?.id });
    }
    const filters: any[] = Array.isArray(config?.filters) ? config.filters : [];
    const logic: 'AND'|'OR' = (String(config?.filterLogic || 'AND').toUpperCase() as 'AND'|'OR');
    if (filters.length) {
      const conds: string[] = [];
      const params: Record<string, any> = {};
      for (const f of filters) {
        const { field, op, value } = f || {};
        if (!field) continue;
        if (op === '=' || op === 'eq') { conds.push(`lead.${field} = :v_${field}`); params[`v_${field}`] = value; }
        else if (op === '!=' || op === 'neq') { conds.push(`lead.${field} != :v_${field}`); params[`v_${field}`] = value; }
        else if (op === 'contains') { conds.push(`LOWER(lead.${field}) LIKE LOWER(:v_${field})`); params[`v_${field}`] = `%${value}%`; }
        else if (op === 'starts') { conds.push(`LOWER(lead.${field}) LIKE LOWER(:v_${field})`); params[`v_${field}`] = `${value}%`; }
        else if (op === 'between' && Array.isArray(value) && value.length === 2) { conds.push(`lead.${field} BETWEEN :v_${field}_a AND :v_${field}_b`); params[`v_${field}_a`] = value[0]; params[`v_${field}_b`] = value[1]; }
        else if (op === 'in') {
          const arr = Array.isArray(value) ? value : String(value || '').split(',').map((s: string)=>s.trim()).filter(Boolean);
          if (arr.length) { conds.push(`lead.${field} IN (:...arr_${field})`); params[`arr_${field}`] = arr; }
        }
      }
      if (conds.length) {
        const whereFrag = conds.map(c => `(${c})`).join(` ${logic} `);
        qb.andWhere(whereFrag, params);
      }
    }
    return qb;
  }

  // Lead history query with center/counselor scoping via joined leads
  private buildLeadHistoryQuery(config: any, user: any) {
    const qb = this.historyRepo
      .createQueryBuilder('h')
      .innerJoin(Lead, 'lead', 'lead.id = h.leadId')
      .where('lead.deleted = :del', { del: false });

    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'center-manager') {
      qb.andWhere(
        `(lead.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName) OR 
          (lead.assignedUserId IS NULL AND lead.createdBy IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)))`,
        { centerName: user?.centerName || null }
      );
    } else if (role === 'counselor') {
      qb.andWhere('lead.assignedUserId = :uid', { uid: user?.id });
    }

    // Simple filters over history fields only
    const filters: any[] = Array.isArray(config?.filters) ? config.filters : [];
    const logic: 'AND' | 'OR' = (String(config?.filterLogic || 'AND').toUpperCase() as 'AND' | 'OR');
    if (filters.length) {
      const conds: string[] = [];
      const params: Record<string, any> = {};
      for (const f of filters) {
        const { field, op, value } = f || {};
        if (!field) continue;
        // Allow only these fields for history
        const allowed = new Set(['leadId', 'action', 'note', 'changedAt']);
        if (!allowed.has(field)) continue;
        const col = field === 'changedAt' ? 'h.changedAt' : field === 'leadId' ? 'h.leadId' : `h.${field}`;
        if (op === '=' || op === 'eq') { conds.push(`${col} = :v_${field}`); params[`v_${field}`] = value; }
        else if (op === '!=' || op === 'neq') { conds.push(`${col} != :v_${field}`); params[`v_${field}`] = value; }
        else if (op === 'contains') { conds.push(`LOWER(${col}) LIKE LOWER(:v_${field})`); params[`v_${field}`] = `%${value}%`; }
        else if (op === 'starts') { conds.push(`LOWER(${col}) LIKE LOWER(:v_${field})`); params[`v_${field}`] = `${value}%`; }
        else if (op === 'between' && Array.isArray(value) && value.length === 2) { conds.push(`${col} BETWEEN :v_${field}_a AND :v_${field}_b`); params[`v_${field}_a`] = value[0]; params[`v_${field}_b`] = value[1]; }
        else if (op === 'in') {
          const arr = Array.isArray(value) ? value : String(value || '').split(',').map((s: string)=>s.trim()).filter(Boolean);
          if (arr.length) { conds.push(`${col} IN (:...arr_${field})`); params[`arr_${field}`] = arr; }
        }
      }
      if (conds.length) {
        const whereFrag = conds.map(c => `(${c})`).join(` ${logic} `);
        qb.andWhere(whereFrag, params);
      }
    }

    return qb;
  }

  async runReport(user: any, body: { reportType: string; config: any; preview?: boolean }) {
    const type = String(body?.reportType || '').toLowerCase();
    const preview = !!body?.preview;
    if (type === 'leads' || !type) {
      const qb = this.buildLeadsQuery(body?.config, user);
      const cols: string[] = Array.isArray(body?.config?.columns) && body.config.columns.length ? body.config.columns : ['referenceNo','firstName','lastName','email','leadStatus','program','leadSource','dateEntered'];
      // Always include id for navigation purposes (even if not in selected columns)
      qb.addSelect('lead.id', 'id');
      // Select with aliases to keep clean keys
      cols.forEach((c) => qb.addSelect(`lead.${c}`, c));
      // sorting
      const sort = body?.config?.sort || { field: 'dateEntered', order: 'DESC' };
      qb.orderBy(`lead.${sort.field}`, String(sort.order).toUpperCase() === 'ASC' ? 'ASC' as any : 'DESC' as any);
      // preview limit
      if (preview) qb.take(200);
      const rows = await qb.getRawMany();
      // Return id in columns only if explicitly selected, but rows always have it
      return { rows, columns: cols };
    }
    if (type === 'lead_history') {
      const qb = this.buildLeadHistoryQuery(body?.config, user);
      const cols: string[] = Array.isArray(body?.config?.columns) && body.config.columns.length ? body.config.columns : ['leadId','action','note','changedAt'];
      // Only allow known history columns
      const allowed = ['leadId','action','note','changedAt'];
      const safeCols = cols.filter(c => allowed.includes(c));
      // Always include leadId for navigation purposes
      qb.addSelect('h.leadId', 'leadId');
      safeCols.forEach((c) => {
        const col = c === 'changedAt' ? 'h.changedAt' : c === 'leadId' ? 'h.leadId' : `h.${c}`;
        qb.addSelect(col, c);
      });
      const sort = body?.config?.sort || { field: 'changedAt', order: 'DESC' };
      const sortField = allowed.includes(sort.field) ? sort.field : 'changedAt';
      const sortCol = sortField === 'changedAt' ? 'h.changedAt' : sortField === 'leadId' ? 'h.leadId' : `h.${sortField}`;
      qb.orderBy(sortCol, String(sort.order).toUpperCase() === 'ASC' ? 'ASC' as any : 'DESC' as any);
      if (preview) qb.take(200);
      const rows = await qb.getRawMany();
      return { rows, columns: safeCols };
    }
    throw new BadRequestException('Unsupported report type');
  }

  async generateChart(user: any, body: { reportType: string; config: any; chart: { x: string; y: string; groupBy?: string; agg?: 'COUNT'|'SUM'|'AVG'|'MIN'|'MAX' } }) {
    const type = String(body?.reportType || '').toLowerCase();
    if (type === 'leads' || !type) {
      const qb = this.buildLeadsQuery(body?.config, user);
      const x = body?.chart?.x;
      const y = body?.chart?.y;
      const agg = (body?.chart?.agg || 'COUNT').toUpperCase();
      const groupBy = body?.chart?.groupBy || x;
      if (!x) throw new BadRequestException('x field required');

      // Validate fields against allowed lead fields
      const allowedLeadFields = new Set((this.getFieldsByType('leads') as any[]).map((f: any) => f.key));
      if (!allowedLeadFields.has(x)) throw new BadRequestException('Invalid x field');
      if (agg !== 'COUNT') {
        if (!y) throw new BadRequestException('y field required for aggregation');
        if (!allowedLeadFields.has(y)) throw new BadRequestException('Invalid y field');
      }

      let aggExpr = 'COUNT(*)';
      if (agg === 'SUM') aggExpr = `SUM(lead.${y})`;
      else if (agg === 'AVG') aggExpr = `AVG(lead.${y})`;
      else if (agg === 'MIN') aggExpr = `MIN(lead.${y})`;
      else if (agg === 'MAX') aggExpr = `MAX(lead.${y})`;

      qb.select(`lead.${groupBy}`, 'group').addSelect(aggExpr, 'value').groupBy(`lead.${groupBy}`).orderBy('value', 'DESC');
      try {
        const rows = await qb.getRawMany();
        return rows.map((r: any) => ({ group: r.group, value: Number(r.value) }));
      } catch (e) {
        // Convert any DB errors to a friendly 400 message
        throw new BadRequestException('Chart could not be prepared. Try a different X axis or aggregation.');
      }
    }
    throw new BadRequestException('Unsupported chart type');
  }
}
