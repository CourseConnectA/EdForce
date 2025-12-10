import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, DataSource } from 'typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { LeadHistory } from '../../database/entities/lead-history.entity';
import { LeadView } from '../../database/entities/lead-view.entity';
import { User } from '../../database/entities/user.entity';
import { LeadFieldSetting } from '../../database/entities/lead-field-setting.entity';
import { CenterFieldVisibility } from '../../database/entities/center-field-visibility.entity';
import { CenterRoutingRule } from '../../database/entities/center-routing-rule.entity';
import { normalizeRole } from '../../common/role.util';
import { getFollowUpMaxDate } from './lead-status.config';
import { DataSyncGateway } from '../../gateways/data-sync.gateway';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
    @InjectRepository(LeadHistory)
    private historyRepo: Repository<LeadHistory>,
    @InjectRepository(User)
    private usersRepo: Repository<User>,
    @InjectRepository(LeadView)
    private viewsRepo: Repository<LeadView>,
    @InjectRepository(LeadFieldSetting)
    private fieldSettingsRepo: Repository<LeadFieldSetting>,
    @InjectRepository(CenterFieldVisibility)
    private centerFieldVisibilityRepo: Repository<CenterFieldVisibility>,
    @InjectRepository(CenterRoutingRule)
    private routingRuleRepo: Repository<CenterRoutingRule>,
    private dataSource: DataSource,
    @Inject(forwardRef(() => DataSyncGateway))
    private dataSyncGateway: DataSyncGateway,
  ) {}

  // Default fields that can be toggled for filters/columns
  private FILTERABLE_FIELDS = [
    { key: 'leadStatus', label: 'Lead Status', type: 'filter' },
    { key: 'leadSubStatus', label: 'Lead Sub-status', type: 'filter' },
    { key: 'leadSource', label: 'Lead Source', type: 'filter' },
    { key: 'industry', label: 'Industry', type: 'filter' },
    { key: 'locationCity', label: 'City', type: 'filter' },
    { key: 'locationState', label: 'State', type: 'filter' },
    { key: 'nationality', label: 'Nationality', type: 'filter' },
    { key: 'program', label: 'Program', type: 'filter' },
    { key: 'specialization', label: 'Specialization', type: 'filter' },
    { key: 'batch', label: 'Batch', type: 'filter' },
    { key: 'highestQualification', label: 'Qualification', type: 'filter' },
    { key: 'yearsOfExperience', label: 'Experience', type: 'filter' },
    { key: 'gender', label: 'Gender', type: 'filter' },
  ];

  private COLUMN_FIELDS = [
    { key: 'referenceNo', label: 'Reference No' },
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'mobileNumber', label: 'Mobile' },
    { key: 'company', label: 'Company' },
    { key: 'leadStatus', label: 'Status' },
    { key: 'leadSubStatus', label: 'Sub-status' },
    { key: 'leadSource', label: 'Source' },
    { key: 'industry', label: 'Industry' },
    { key: 'locationCity', label: 'City' },
    { key: 'locationState', label: 'State' },
    { key: 'program', label: 'Program' },
    { key: 'specialization', label: 'Specialization' },
    { key: 'batch', label: 'Batch' },
    { key: 'highestQualification', label: 'Qualification' },
    { key: 'yearsOfExperience', label: 'Experience' },
    { key: 'estimatedValue', label: 'Value' },
    { key: 'nextFollowUpAt', label: 'Next Follow-up' },
    { key: 'lastCallDisposition', label: 'Last Call Disposition' },
    { key: 'lastCallNotes', label: 'Last Call Notes' },
    { key: 'counselor', label: 'Counselor' },
    { key: 'owner', label: 'Owner' },
    { key: 'dateEntered', label: 'Created Date' },
  ];

  // ==================== CENTER FIELD VISIBILITY ====================

  async getCenterFieldVisibility(user: any) {
    const role = normalizeRole(user?.role, user?.isAdmin);
    const centerName = user?.centerName;

    if (!centerName) {
      // Return all fields as enabled for super-admin or users without center
      return {
        filters: this.FILTERABLE_FIELDS.map(f => ({ ...f, enabled: true })),
        columns: this.COLUMN_FIELDS.map(f => ({ ...f, enabled: true })),
      };
    }

    // Get existing settings for this center
    const existing = await this.centerFieldVisibilityRepo.find({
      where: { centerName } as any,
    });

    const existingMap = new Map<string, CenterFieldVisibility>();
    existing.forEach(e => existingMap.set(e.fieldKey, e));

    // Build filter fields with enabled status
    const filters = this.FILTERABLE_FIELDS.map(f => {
      const setting = existingMap.get(f.key);
      return {
        key: f.key,
        label: f.label,
        enabled: setting ? setting.filterEnabled : true, // Default enabled
      };
    });

    // Build column fields with enabled status
    const columns = this.COLUMN_FIELDS.map(f => {
      const setting = existingMap.get(f.key);
      return {
        key: f.key,
        label: f.label,
        enabled: setting ? setting.columnEnabled : true, // Default enabled
      };
    });

    return { filters, columns };
  }

  async saveCenterFieldVisibility(
    settings: Array<{ key: string; filterEnabled?: boolean; columnEnabled?: boolean }>,
    user: any,
  ) {
    const role = normalizeRole(user?.role, user?.isAdmin);
    const centerName = user?.centerName;

    // Only center managers can save settings
    if (role !== 'center-manager' || !centerName) {
      throw new ForbiddenException('Only center managers can modify field visibility settings');
    }

    for (const s of settings) {
      if (!s.key) continue;

      const existing = await this.centerFieldVisibilityRepo.findOne({
        where: { centerName, fieldKey: s.key } as any,
      });

      if (existing) {
        if (typeof s.filterEnabled === 'boolean') existing.filterEnabled = s.filterEnabled;
        if (typeof s.columnEnabled === 'boolean') existing.columnEnabled = s.columnEnabled;
        await this.centerFieldVisibilityRepo.save(existing);
      } else {
        const newSetting = this.centerFieldVisibilityRepo.create({
          centerName,
          fieldKey: s.key,
          filterEnabled: s.filterEnabled ?? true,
          columnEnabled: s.columnEnabled ?? true,
        });
        await this.centerFieldVisibilityRepo.save(newSetting);
      }
    }

    return this.getCenterFieldVisibility(user);
  }

  // Field settings
  private DEFAULT_FIELD_SETTINGS: Array<{key:string; visible:boolean; required:boolean}> = [
    // Identity & contact (mandatory core fields)
    { key: 'referenceNo', visible: true, required: true },
    { key: 'firstName', visible: true, required: true },
    { key: 'lastName', visible: true, required: true },
    { key: 'email', visible: true, required: true },
    { key: 'emailVerified', visible: true, required: false },
    { key: 'mobileNumber', visible: true, required: true },
    { key: 'alternateNumber', visible: true, required: false },
    { key: 'mobileVerified', visible: true, required: false },
    { key: 'whatsappNumber', visible: true, required: false },
    { key: 'whatsappVerified', visible: true, required: false },

    // Location & demographics
    { key: 'locationCity', visible: true, required: false },
    { key: 'locationState', visible: true, required: false },
    { key: 'nationality', visible: true, required: false },
    { key: 'gender', visible: true, required: false },
    { key: 'dateOfBirth', visible: true, required: false },
    { key: 'motherTongue', visible: true, required: false },

    // Education & program
    { key: 'highestQualification', visible: true, required: false },
    { key: 'yearOfCompletion', visible: true, required: false },
    { key: 'yearsOfExperience', visible: true, required: false },
    { key: 'university', visible: true, required: false },
    { key: 'program', visible: true, required: false },
    { key: 'specialization', visible: true, required: false },
    { key: 'batch', visible: true, required: false },

    // Business
  // Hide legacy business fields by default (still supported on entity)
  { key: 'company', visible: false, required: false },
  { key: 'title', visible: false, required: false },
  { key: 'industry', visible: false, required: false },
  { key: 'website', visible: false, required: false },

    // Lead meta
    { key: 'leadSource', visible: true, required: false },
    { key: 'leadSubSource', visible: true, required: false },
    { key: 'createdFrom', visible: true, required: false },
    { key: 'leadStatus', visible: true, required: false },
    { key: 'leadSubStatus', visible: true, required: false },
    { key: 'leadDescription', visible: true, required: false },
    { key: 'reasonDeadInvalid', visible: true, required: false },
    { key: 'nextFollowUpAt', visible: true, required: false },
    { key: 'comment', visible: true, required: false },

    // Audit & computed
    { key: 'leadScorePercent', visible: true, required: false },
    { key: 'dateEntered', visible: true, required: false },
    { key: 'dateModified', visible: true, required: false },

    // Ownership (read-only in form, but togglable visibility)
    { key: 'assignedUserId', visible: true, required: false },
    { key: 'counselorName', visible: true, required: false },
    { key: 'counselorCode', visible: true, required: false },
  ];

  async getFieldSettings() {
    const existing = await this.fieldSettingsRepo.find();
    const existingKeys = new Set(existing.map(e => e.key));
    const toAdd = this.DEFAULT_FIELD_SETTINGS.filter(d => !existingKeys.has(d.key));
    if (toAdd.length) {
      const created = this.fieldSettingsRepo.create(toAdd.map(d => ({ key: d.key, visible: d.visible, required: d.required })) as any);
      await this.fieldSettingsRepo.save(created);
    }
    // Also ensure that core mandatory fields are always required in settings snapshot
    const mandatoryKeys = new Set(['referenceNo','firstName','lastName','email','mobileNumber']);
    for (const s of existing) {
      if (mandatoryKeys.has(s.key) && !s.required) {
        s.required = true;
        s.visible = true;
        await this.fieldSettingsRepo.save(s);
      }
    }
    // Hide any stray/legacy keys not in the default allow-list
    const allowedKeys = new Set(this.DEFAULT_FIELD_SETTINGS.map(d => d.key));
    for (const s of await this.fieldSettingsRepo.find()) {
      if (!allowedKeys.has(s.key)) {
        if (s.visible || s.required) {
          s.visible = false;
          s.required = false;
          await this.fieldSettingsRepo.save(s);
        }
      }
    }
    return this.fieldSettingsRepo.find({ order: { key: 'ASC' as any } });
  }

  async saveFieldSettings(settings: Array<{ key: string; visible?: boolean; required?: boolean }>) {
    if (!Array.isArray(settings)) throw new BadRequestException('settings must be an array');
    for (const s of settings) {
      if (!s.key) continue;
      const existing = await this.fieldSettingsRepo.findOne({ where: { key: s.key } as any });
      if (existing) {
        if (typeof s.visible === 'boolean') existing.visible = s.visible;
        if (typeof s.required === 'boolean') existing.required = s.required;
        await this.fieldSettingsRepo.save(existing);
      } else {
        await this.fieldSettingsRepo.save(this.fieldSettingsRepo.create({ key: s.key, visible: !!s.visible, required: !!s.required }));
      }
    }
    return this.getFieldSettings();
  }

  private async validateRequiredAgainstSettings(dto: Partial<Lead>) {
    const settings = await this.getFieldSettings();
    const requiredKeys = settings.filter(s => s.required).map(s => s.key);
    const missing = requiredKeys.filter(k => (dto as any)[k] === undefined || (String((dto as any)[k] ?? '').trim() === ''));
    if (missing.length) {
      throw new BadRequestException(`Missing required fields: ${missing.join(', ')}`);
    }
  }

  private generateDigits(length: number = 10): string {
    // Numeric-only sequence (8-10 digits). Use 10 by default.
    const digits = '0123456789';
    const len = Math.max(8, Math.min(10, length));
    let out = '';
    for (let i = 0; i < len; i++) out += digits.charAt(Math.floor(Math.random() * digits.length));
    if (out[0] === '0') out = String(Math.floor(1 + Math.random() * 9)) + out.slice(1);
    return out;
  }

  private normalizeCenterName(input?: string | null): string {
    const s = String(input || '').toUpperCase();
    // Keep letters and spaces, collapse whitespace
    return s.replace(/[^A-Z\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private generateCenterCandidates(name: string): string[] {
    const norm = this.normalizeCenterName(name);
    if (!norm) return ['XX'];
    const words = norm.split(' ').filter(Boolean);
    const uniq = new Set<string>();
    const push = (c: string) => {
      const cc = c.replace(/[^A-Z]/g, '').slice(0, 3);
      if (cc.length >= 2 && cc.length <= 3) uniq.add(cc);
    };

    if (words.length >= 2) {
      // Prefer 2-letter codes for multi-word names
      const w1 = words[0];
      const w2 = words[1];
      const wl = words[words.length - 1];
      push(w1[0] + w2[0]);
      push(w1[0] + wl[0]);
      push(w1.slice(0, 2));
      // 3-letter alternates
      if (words.length >= 3) push(words[0][0] + words[1][0] + words[2][0]);
      push(w1.slice(0, 2) + w2[0]);
      push(w1[0] + w2.slice(0, 2));
      // Fallback: first+middle+last of concatenated
      const conc = words.join('');
      if (conc.length >= 3) {
        push(conc[0] + conc[Math.floor(conc.length / 2)] + conc[conc.length - 1]);
      }
    } else {
      // Single-word: prefer 3 letters if available
      const w = words[0];
      if (w.length >= 3) push(w.slice(0, 3));
      if (w.length >= 2) push(w.slice(0, 2));
      if (w.length >= 3) push(w.slice(0, 2) + w[w.length - 1]);
      if (w.length >= 3) push(w[0] + w[Math.floor(w.length / 2)] + w[w.length - 1]);
      if (w.length >= 3) push(w[0] + w[1] + w[w.length - 1]);
      if (w.length === 1) push(w[0] + w[0]); // e.g., A -> AA
    }

    return Array.from(uniq);
  }

  private lettersHash(name: string, length: 2 | 3): string {
    // Simple deterministic hash mapped to A-Z letters
    let h = 2166136261 >>> 0; // FNV-1a
    for (let i = 0; i < name.length; i++) {
      h ^= name.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    const out: string[] = [];
    for (let i = 0; i < length; i++) {
      const v = (h >>> (i * 5)) & 31; // 5 bits
      out.push(String.fromCharCode(65 + (v % 26)));
    }
    return out.join('');
  }

  private async buildCenterCodeMap(): Promise<Map<string, string>> {
    // Build a stable, deterministic mapping of center names -> unique 2-3 letter codes
    const rows = await this.usersRepo
      .createQueryBuilder('u')
      .select('DISTINCT u.center_name', 'centerName')
      .where("u.center_name IS NOT NULL AND u.center_name != ''")
      .andWhere('u.deleted = :del', { del: false })
      .getRawMany<{ centerName: string }>();
    const names = Array.from(new Set(rows.map(r => this.normalizeCenterName(r.centerName)).filter(Boolean))).sort();
    const used = new Set<string>();
    const map = new Map<string, string>();
    for (const name of names) {
      const cands = this.generateCenterCandidates(name);
      let pick = cands.find(c => !used.has(c));
      if (!pick) {
        // Try hashed variants, prefer 2 letters for multi-word, 3 for single-word
        const words = name.split(' ').filter(Boolean);
        const prefLen: 2 | 3 = words.length >= 2 ? 2 : 3;
        pick = this.lettersHash(name, prefLen);
        // If still collides, flip length
        if (used.has(pick)) {
          pick = this.lettersHash(name + '#', prefLen === 2 ? 3 : 2);
        }
        // As a last resort, iterate suffixes
        let salt = 1;
        while (used.has(pick) && salt < 10) {
          pick = this.lettersHash(name + '::' + salt, 3);
          salt++;
        }
      }
      used.add(pick);
      map.set(name, pick);
    }
    return map;
  }

  private async getCenterCode(centerName?: string | null): Promise<string> {
    const norm = this.normalizeCenterName(centerName || '');
    if (!norm) return 'XX';
    const map = await this.buildCenterCodeMap();
    return map.get(norm) || (this.generateCenterCandidates(norm)[0] || 'XX');
  }

  // Deprecated: random counselor codes removed; we use username for display.
  private async ensureCounselorCode(userId: string): Promise<string | null> {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    return user?.userName || null;
  }

  private statusToScore(status?: string): number {
    const map: Record<string, number> = {
      New: 10,
      Assigned: 20,
      'In Process': 40,
      'In Progress': 40,
      Interested: 60,
      Qualified: 70,
      Converted: 100,
      Recycled: 15,
      Dead: 0,
      Invalid: 0,
      Hot: 70,
      Warm: 50,
      Cold: 30,
      Frozen: 20,
      'Frozen (next drive)': 20,
      'University Form filled': 80,
      'Registration Fee Paid': 85,
      'Reg Fee Paid & Documents Uploaded': 90,
      'Documents Approved': 95,
      'Documents Rejected': 40,
      'Admission Fee Paid': 80,
      'Semester fee paid': 90,
      'Yearly fee paid': 95,
      'Full fee paid - Lumpsum': 100,
      'Full fee paid - Loan': 100,
      'Closed - Won': 100,
      'Closed - Lost': 0,
      'Needs Follow Up': 40,
      Reborn: 20,
      'Ask to Call back': 25,
      'Not interested': 0,
      'Ask for Information': 15,
      'Invalid No/Wrong No': 0,
      'Phone Switched Off/Ringing/No Response': 10,
      'Dead On Arrival': 0,
      DND: 0,
    };
    return map[String(status || '').trim()] ?? 0;
  }

  private async autoAssignUserId(centerName?: string | null): Promise<string | undefined> {
    if (!centerName) return undefined;
    // Find counselors in center
    const counselors = await this.usersRepo.find({ where: { role: 'counselor', centerName, deleted: false } as any });
    if (!counselors.length) return undefined;
    // Count assigned leads per counselor
    const counts = await this.leadRepository
      .createQueryBuilder('l')
      .select('l.assignedUserId', 'uid')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.assignedUserId IN (:...ids)', { ids: counselors.map((c) => c.id) })
      .groupBy('l.assignedUserId')
      .getRawMany<{ uid: string; cnt: string }>();
    const countMap = new Map<string, number>(counts.map((r) => [r.uid, Number(r.cnt)]));
    // Choose least loaded
    counselors.sort((a, b) => (countMap.get(a.id) ?? 0) - (countMap.get(b.id) ?? 0));
    return counselors[0].id;
  }

  async create(createLeadDto: CreateLeadDto, user?: any): Promise<Lead> {
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role !== 'center-manager' && role !== 'counselor') {
      throw new ForbiddenException('Not allowed to create leads');
    }

    if (!createLeadDto.firstName || !createLeadDto.lastName || !createLeadDto.email || !createLeadDto.mobileNumber) {
      throw new BadRequestException('firstName, lastName, email, mobileNumber are required');
    }

    // Validate follow-up window if provided
    if (createLeadDto.nextFollowUpAt) {
      const max = getFollowUpMaxDate(createLeadDto.leadStatus || '');
      const dt = new Date(createLeadDto.nextFollowUpAt);
      if (isNaN(dt.getTime())) {
        throw new BadRequestException('Invalid nextFollowUpAt date');
      }
      const now = new Date();
      if (dt < now) {
        throw new BadRequestException('nextFollowUpAt cannot be in the past');
      }
      if (max && dt > max) {
        throw new BadRequestException(`nextFollowUpAt exceeds allowed window for status "${createLeadDto.leadStatus}"`);
      }
    }

    // Generate unique reference number with center prefix
    const centerCode = await this.getCenterCode(user?.centerName || null);
    let referenceNo = `${centerCode}${this.generateDigits(10)}`;
    for (let i = 0; i < 3; i++) {
      const exists = await this.leadRepository.exist({ where: { referenceNo } as any });
      if (!exists) break;
      referenceNo = `${centerCode}${this.generateDigits(10)}`;
    }

  // Validate required per settings (beyond base hard requirements)
  await this.validateRequiredAgainstSettings({ ...createLeadDto, referenceNo } as any);

    // Determine auto-assignment per active routing rule (center-manager created leads only)
    let assignedUserId: string | undefined = user?.id;
    const creatorRole = role;
    if (creatorRole === 'center-manager') {
      const centerName = user?.centerName || null;
      const activeRule = await this.getActiveRoutingRule(centerName);
      if (activeRule) {
        const pick = await this.pickAssigneeByRule(activeRule, createLeadDto, centerName);
        if (pick) assignedUserId = pick;
      }
    }

    // Compute score
    const statusScore = this.statusToScore(createLeadDto.leadStatus || 'New');
    const leadScorePercent = Math.max(statusScore, createLeadDto.actionsScore ?? 0);

    const payload: Partial<Lead> = {
      referenceNo,
      createdBy: user?.id || null,
      modifiedBy: user?.id || null,
      firstName: createLeadDto.firstName,
      lastName: createLeadDto.lastName,
      email: createLeadDto.email,
      emailVerified: !!createLeadDto.emailVerified,
      mobileNumber: createLeadDto.mobileNumber,
      alternateNumber: createLeadDto.alternateNumber,
      mobileVerified: !!createLeadDto.mobileVerified,
      whatsappNumber: createLeadDto.whatsappNumber || createLeadDto.mobileNumber,
      whatsappVerified: !!createLeadDto.whatsappVerified,
      locationCity: createLeadDto.locationCity,
      locationState: createLeadDto.locationState,
      nationality: createLeadDto.nationality,
      gender: createLeadDto.gender,
      dateOfBirth: createLeadDto.dateOfBirth ? new Date(createLeadDto.dateOfBirth) : undefined,
      motherTongue: createLeadDto.motherTongue,
      highestQualification: createLeadDto.highestQualification,
      yearOfCompletion: createLeadDto.yearOfCompletion,
      yearsOfExperience: createLeadDto.yearsOfExperience,
      university: createLeadDto.university,
      program: createLeadDto.program,
      specialization: createLeadDto.specialization,
      batch: createLeadDto.batch,
      assignedUserId,
      leadSource: createLeadDto.leadSource,
      leadSubSource: createLeadDto.leadSubSource,
      createdFrom: createLeadDto.createdFrom,
      leadStatus: createLeadDto.leadStatus || 'New',
      leadSubStatus: createLeadDto.leadSubStatus,
      nextFollowUpAt: createLeadDto.nextFollowUpAt ? new Date(createLeadDto.nextFollowUpAt) : undefined,
      leadDescription: createLeadDto.leadDescription,
      reasonDeadInvalid: createLeadDto.reasonDeadInvalid,
      comment: createLeadDto.comment,
      company: createLeadDto.company,
      title: createLeadDto.title,
      industry: createLeadDto.industry,
      website: createLeadDto.website,
      isImportant: !!(createLeadDto as any).isImportant,
      leadScorePercent,
    };

    try {
      const lead = this.leadRepository.create(payload as Lead);
      const saved = await this.leadRepository.save(lead);

      // Counselor meta enrichment (use username instead of random code)
      if (saved.assignedUserId) {
        const assignee = await this.usersRepo.findOne({ where: { id: saved.assignedUserId } });
        if (assignee) {
          await this.leadRepository.update(saved.id, {
            counselorName: `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim(),
            counselorCode: assignee.userName || null,
          } as any);
        }
      }

      // History entries
      await this.historyRepo.save(
        this.historyRepo.create({
          leadId: saved.id,
          action: 'create',
          changedBy: user?.id ?? null,
          toValue: { leadStatus: saved.leadStatus, assignedUserId: saved.assignedUserId, referenceNo: saved.referenceNo },
        }),
      );
      if (saved.assignedUserId) {
        await this.historyRepo.save(
          this.historyRepo.create({
            leadId: saved.id,
            action: 'assignment',
            changedBy: user?.id ?? null,
            toValue: { assignedUserId: saved.assignedUserId },
          }),
        );
      }
      if (createLeadDto.comment) {
        await this.historyRepo.save(
          this.historyRepo.create({ leadId: saved.id, action: 'comment', changedBy: user?.id ?? null, note: createLeadDto.comment }),
        );
      }

      const result = await this.findOne(saved.id, user);
      
      // Emit WebSocket event for real-time update
      try {
        this.dataSyncGateway.emitLeadCreated(result, user?.centerName);
      } catch (wsError) {
        console.error('Failed to emit lead:created event:', wsError);
      }
      
      return result;
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new BadRequestException('Duplicate lead (email or reference number conflict)');
      }
      throw error;
    }
  }

  private async getActiveRoutingRule(centerName: string | null): Promise<CenterRoutingRule | null> {
    if (!centerName) return null;
    const now = new Date();
    const rule = await this.routingRuleRepo.createQueryBuilder('r')
      .where('r.center_name = :center', { center: centerName })
      .andWhere('r.is_active = :ia', { ia: true })
      .orderBy('r.date_modified', 'DESC')
      .getOne();
    if (!rule) return null;
    if (rule.activeUntil && rule.activeUntil < now) {
      rule.isActive = false;
      await this.routingRuleRepo.save(rule);
      return null;
    }
    return rule;
  }

  private getAvailablePresenceSet(): Set<string> {
    return new Set(['online', 'on_call', 'in_meeting']);
  }

  private getInactiveStatuses(): Set<string> {
    // Consider these as non-active leads for load count
    return new Set([
      'Closed - Won','Closed - Lost','Not interested','Dead On Arrival','DND','Invalid No/Wrong No',
      'Documents Rejected','Full fee paid - Lumpsum','Full fee paid - Loan','Yearly fee paid','Semester fee paid',
    ]);
  }

  private async listCenterCounselors(centerName: string): Promise<User[]> {
    return this.usersRepo.find({ where: { role: 'counselor', centerName, deleted: false } as any });
  }

  private async countActiveLeadsByCounselors(ids: string[]): Promise<Map<string, number>> {
    if (!ids.length) return new Map();
    const inactive = this.getInactiveStatuses();
    const rows = await this.leadRepository
      .createQueryBuilder('l')
      .select('l.assignedUserId', 'uid')
      .addSelect('COUNT(*)', 'cnt')
      .where('l.assignedUserId IN (:...ids)', { ids })
      .andWhere("COALESCE(l.leadStatus,'') NOT IN (:...closed)", { closed: Array.from(inactive) })
      .groupBy('l.assignedUserId')
      .getRawMany<{ uid: string; cnt: string }>();
    return new Map(rows.map(r => [r.uid, Number(r.cnt)]));
  }

  private async pickAssigneeByRule(rule: CenterRoutingRule, dto: CreateLeadDto, centerName: string | null): Promise<string | undefined> {
    if (!centerName) return undefined;
    const counselors = await this.listCenterCounselors(centerName);
    if (!counselors.length) return undefined;
    const availablePresence = this.getAvailablePresenceSet();
    const available = counselors.filter(c => availablePresence.has((c as any).presence || 'offline'));
    if (!available.length) return undefined;
    const maxActive = Number(rule?.config?.maxActiveLeadsPerCounselor ?? 30) || 30;
    const counts = await this.countActiveLeadsByCounselors(available.map(c => c.id));
    const underCap = available.filter(c => (counts.get(c.id) ?? 0) < maxActive);
    if (!underCap.length) return undefined;

    if (rule.ruleType === 'skill_match') {
      const interest = String(dto.program || dto.specialization || '').trim();
      const language = String((dto as any).motherTongue || '').trim();
      const interestMap: Record<string, string[]> = rule?.config?.interestToCounselors || {};
      const langMap: Record<string, string[]> = rule?.config?.languageToCounselors || {};
      const pool = new Set<string>();
      if (interest && Array.isArray(interestMap[interest])) interestMap[interest].forEach(id => pool.add(id));
      if (language && Array.isArray(langMap[language])) langMap[language].forEach(id => pool.add(id));
      const matched = underCap.filter(c => pool.has(c.id));
      if (matched.length) {
        // choose least loaded among matched
        matched.sort((a,b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
        const chosen = matched[0];
        await this.routingRuleRepo.update({ id: rule.id } as any, { lastAssignedUserId: chosen.id } as any);
        return chosen.id;
      }
      // fall back to round-robin behavior on underCap
    }

    // Round-robin with availability across underCap set (stable order by id)
    const sorted = [...underCap].sort((a,b) => a.id.localeCompare(b.id));
    let idx = rule.lastAssignedUserId ? sorted.findIndex(c => c.id === rule.lastAssignedUserId) : -1;
    for (let i=0;i<sorted.length;i++) {
      const next = sorted[(idx + 1 + i) % sorted.length];
      if ((counts.get(next.id) ?? 0) < maxActive) {
        await this.routingRuleRepo.update({ id: rule.id } as any, { lastAssignedUserId: next.id } as any);
        return next.id;
      }
    }
    // fallback to least loaded
    sorted.sort((a,b) => (counts.get(a.id) ?? 0) - (counts.get(b.id) ?? 0));
    const pick = sorted[0];
    await this.routingRuleRepo.update({ id: rule.id } as any, { lastAssignedUserId: pick.id } as any);
    return pick.id;
  }

  async findAll(query: LeadQueryDto, user?: any) {
    const { page = 1, limit = 10, search, sortBy = 'dateEntered', sortOrder = 'DESC', ...filters } = query;
    const qb: SelectQueryBuilder<Lead> = this.leadRepository.createQueryBuilder('lead');
    // Always exclude soft-deleted rows
    qb.where('lead.deleted = :deleted', { deleted: false });

    // Role-based scoping
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'center-manager') {
      // Show leads assigned to center users OR unassigned leads created by center users
      qb.andWhere(
        `(lead.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName) OR 
          (lead.assignedUserId IS NULL AND lead.createdBy IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)))`,
        { centerName: user?.centerName || null }
      );
    } else if (role === 'counselor') {
      qb.andWhere('lead.assignedUserId = :uid', { uid: user?.id });
    } else if (role === 'super-admin') {
      // No additional filter: super-admin sees all centers
    } else {
      qb.andWhere('1=0');
    }

    // Search across key fields
    if (search) {
      qb.andWhere(
        `(
          LOWER(lead.referenceNo) LIKE LOWER(:search) OR
          LOWER(lead.firstName) LIKE LOWER(:search) OR
          LOWER(lead.lastName) LIKE LOWER(:search) OR
          LOWER(lead.email) LIKE LOWER(:search) OR
          LOWER(lead.mobileNumber) LIKE LOWER(:search) OR
          LOWER(lead.company) LIKE LOWER(:search)
        )`,
        { search: `%${search}%` },
      );
    }

    // Filters
  const f: any = filters as any;
    if (f.leadStatus) qb.andWhere('lead.leadStatus = :leadStatus', { leadStatus: f.leadStatus });
    if (f.leadSubStatus) qb.andWhere('lead.leadSubStatus = :leadSubStatus', { leadSubStatus: f.leadSubStatus });
    if (f.leadSource) qb.andWhere('lead.leadSource = :leadSource', { leadSource: f.leadSource });
    if (f.leadSubSource) qb.andWhere('lead.leadSubSource = :leadSubSource', { leadSubSource: f.leadSubSource });
    if (f.locationCity) qb.andWhere('lead.locationCity = :locationCity', { locationCity: f.locationCity });
    if (f.locationState) qb.andWhere('lead.locationState = :locationState', { locationState: f.locationState });
    if (f.nationality) qb.andWhere('lead.nationality = :nationality', { nationality: f.nationality });
    if (f.industry) qb.andWhere('LOWER(lead.industry) LIKE LOWER(:industry)', { industry: `%${f.industry}%` });
    if (f.company) qb.andWhere('LOWER(lead.company) LIKE LOWER(:company)', { company: `%${f.company}%` });
    if (f.createdAfter) qb.andWhere('lead.dateEntered >= :createdAfter', { createdAfter: f.createdAfter });
    if (f.createdBefore) qb.andWhere('lead.dateEntered <= :createdBefore', { createdBefore: f.createdBefore });
    if (typeof (f as any).isImportant !== 'undefined') {
      const imp = String((f as any).isImportant).toLowerCase();
      qb.andWhere('lead.isImportant = :imp', { imp: imp === 'true' || imp === '1' });
    }
    // Counselor filter (center-manager only effectively expands scope; counselor scope is already restricted)
    const assignedFilter: string | undefined = f.assignedUserId || f.assignedToId;
    if (assignedFilter) {
      qb.andWhere('lead.assignedUserId = :assigned', { assigned: assignedFilter });
    }

    // Sorting (normalize and widen accepted fields)
    const requested = String(sortBy || '').trim();
    const order = String(sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const allowed = new Set([
      'firstName',
      'lastName',
      'company',
      'email',
      'mobileNumber',
      'leadStatus',
      'leadSource',
      'isImportant',
      'leadScorePercent',
      'dateEntered',
      'dateModified',
    ]);
    if (requested === 'name') {
      qb.orderBy('lead.lastName', order as any).addOrderBy('lead.firstName', order as any);
    } else if (allowed.has(requested)) {
      qb.orderBy(`lead.${requested}`, order as any);
    } else {
      qb.orderBy('lead.dateEntered', order as any);
    }

    // Pagination
    const offset = (page - 1) * limit;
    qb.skip(offset).take(limit);

    const [leads, total] = await qb.getManyAndCount();
    // Enrich with ownerName/ownerUsername and last call data for list view
    try {
      const userIds = new Set<string>();
      const leadIds = leads.map(l => l.id);
      
      for (const l of leads) {
        const creatorId = (l as any).createdBy; if (creatorId) userIds.add(creatorId);
        const assigned = (l as any).assignedUserId; if (assigned) userIds.add(assigned);
      }
      
      // Fetch users
      let userMap = new Map<string, User>();
      if (userIds.size) {
        const users = await this.usersRepo.createQueryBuilder('u').where('u.id IN (:...ids)', { ids: Array.from(userIds) }).getMany();
        userMap = new Map<string, User>(users.map(u => [u.id, u]));
      }
      
      // Fetch last call for each lead
      let callMap = new Map<string, any>();
      if (leadIds.length > 0) {
        const lastCalls = await this.dataSource.query(`
          SELECT DISTINCT ON (cl.lead_id) 
            cl.lead_id, 
            cl.disposition, 
            cl.notes
          FROM call_logs cl
          WHERE cl.lead_id = ANY($1)
          ORDER BY cl.lead_id, cl.start_time DESC
        `, [leadIds]);
        
        callMap = new Map(lastCalls.map((c: any) => [c.lead_id, c]));
      }
      
      const enriched = leads.map((l) => {
        const creatorId = (l as any).createdBy;
        let owner = creatorId ? userMap.get(creatorId) : undefined;
        if (!owner && (l as any).assignedUserId) owner = userMap.get((l as any).assignedUserId);
        const ownerName = owner ? ((`${owner.firstName || ''} ${owner.lastName || ''}`.trim()) || owner.userName) : null;
        const ownerUsername = owner?.userName || null;
        
        // Get last call data
        const lastCall = callMap.get(l.id);
        const lastCallDisposition = lastCall?.disposition || null;
        const lastCallNotes = lastCall?.notes || null;
        
        return { ...l, ownerName, ownerUsername, lastCallDisposition, lastCallNotes } as any;
      });
      return { data: enriched, total, page, limit, totalPages: Math.ceil(total / (limit || 1)) };
    } catch (error) {
      console.error('Error enriching leads:', error);
    }
    // Fallback: return leads without enrichment
    return { data: leads as any, total, page, limit, totalPages: Math.ceil(total / (limit || 1)) };
  }

  async findOne(id: string, user?: any): Promise<any> {
    const lead = await this.leadRepository.findOne({ where: { id } });
    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }
    if (user) {
      const role = normalizeRole(user?.role, user?.isAdmin);
      if (role === 'center-manager') {
        // Ensure lead is under same center (assigned to center users OR unassigned but created by center users)
        const cnt = await this.leadRepository.createQueryBuilder('l')
          .where('l.id = :id', { id })
          .andWhere(
            `(l.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName) OR 
              (l.assignedUserId IS NULL AND l.createdBy IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)))`,
            { centerName: user?.centerName || null }
          )
          .getCount();
        if (!cnt) throw new ForbiddenException('Not allowed to access this lead');
      } else if (role === 'counselor') {
        if (lead.assignedUserId !== user?.id) throw new ForbiddenException('Not allowed to access this lead');
      } else if (role === 'super-admin') {
        // Allowed to view any lead
      } else {
        throw new ForbiddenException('Not allowed');
      }
    }
    // Enrich with ownerName and ownerUsername (creator)
    try {
      const creatorId = (lead as any).createdBy;
      let owner = null as User | null;
      if (creatorId) {
        owner = await this.usersRepo.findOne({ where: { id: creatorId } });
      }
      // Fallback: if createdBy is missing, use assigned user as owner
      if (!owner && (lead as any).assignedUserId) {
        owner = await this.usersRepo.findOne({ where: { id: (lead as any).assignedUserId } });
      }
      const ownerName = owner ? (`${owner.firstName || ''} ${owner.lastName || ''}`.trim() || owner.userName) : null;
      const ownerUsername = owner?.userName || null;
      return { ...lead, ownerName, ownerUsername };
    } catch {}
    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, user?: any): Promise<Lead> {
    const lead = await this.findOne(id, user);
  const role = normalizeRole(user?.role, user?.isAdmin);
    const before = { ...lead };

    // Restrict counselor editing to specific fields only
    if (role === 'counselor') {
      const allowed = new Set(['leadStatus', 'leadSubStatus', 'leadDescription', 'nextFollowUpAt']);
      Object.keys(updateLeadDto || {}).forEach((k) => {
        if (!allowed.has(k)) {
          delete (updateLeadDto as any)[k];
        }
      });
    }
    // Allow center-managers to update lead status and substatus
    // (Previously blocked, but this causes confusion - allowing now)

    // Owner change tracking
    const ownerChanged = updateLeadDto.assignedUserId && updateLeadDto.assignedUserId !== lead.assignedUserId;
  const statusChanged = typeof updateLeadDto.leadStatus === 'string' && updateLeadDto.leadStatus !== lead.leadStatus;
  const subStatusChanged = typeof updateLeadDto.leadSubStatus === 'string' && updateLeadDto.leadSubStatus !== lead.leadSubStatus;

    // Score update: recompute if status changed or actionsScore provided
    const statusScore = this.statusToScore(updateLeadDto.leadStatus ?? lead.leadStatus);
    const combinedScore = Math.max(statusScore, updateLeadDto.actionsScore ?? lead.leadScorePercent ?? 0);
    if (updateLeadDto.actionsScore !== undefined || statusChanged) {
      (updateLeadDto as any).leadScorePercent = combinedScore;
    }

    try {
      // Validate follow-up window if provided (after role-based stripping)
      if (updateLeadDto.nextFollowUpAt) {
        const effectiveStatus = updateLeadDto.leadStatus ?? lead.leadStatus;
        const max = getFollowUpMaxDate(effectiveStatus || '');
        const dt = new Date(updateLeadDto.nextFollowUpAt);
        if (isNaN(dt.getTime())) {
          throw new BadRequestException('Invalid nextFollowUpAt date');
        }
        const now = new Date();
        if (dt < now) {
          throw new BadRequestException('nextFollowUpAt cannot be in the past');
        }
        if (max && dt > max) {
          throw new BadRequestException(`nextFollowUpAt exceeds allowed window for status "${effectiveStatus}"`);
        }
      }
      // Validate required against settings using a snapshot with pending changes
      const snapshot = { ...lead, ...updateLeadDto } as any;
      await this.validateRequiredAgainstSettings(snapshot);
  Object.assign(lead, updateLeadDto as any, { modifiedBy: user?.id || (lead as any).modifiedBy } as any);
      const saved = await this.leadRepository.save(lead);

      if (ownerChanged) {
        await this.historyRepo.save(
          this.historyRepo.create({
            leadId: saved.id,
            action: 'owner_change',
            changedBy: user?.id ?? null,
            fromValue: { assignedUserId: before.assignedUserId },
            toValue: { assignedUserId: saved.assignedUserId },
          }),
        );
      }
      if (statusChanged) {
        await this.historyRepo.save(
          this.historyRepo.create({
            leadId: saved.id,
            action: 'status_change',
            changedBy: user?.id ?? null,
            fromValue: { leadStatus: before.leadStatus },
            toValue: { leadStatus: saved.leadStatus },
          }),
        );
      }
      if (subStatusChanged) {
        await this.historyRepo.save(
          this.historyRepo.create({
            leadId: saved.id,
            action: 'sub_status_change',
            changedBy: user?.id ?? null,
            fromValue: { leadSubStatus: before.leadSubStatus },
            toValue: { leadSubStatus: saved.leadSubStatus },
          }),
        );
      }

      // Emit WebSocket event for real-time update
      try {
        this.dataSyncGateway.emitLeadUpdated(saved, user?.centerName);
      } catch (wsError) {
        console.error('Failed to emit lead:updated event:', wsError);
      }

      return saved;
    } catch (error) {
      if ((error as any)?.code === '23505') {
        throw new BadRequestException('Duplicate value (email/reference no)');
      }
      throw error;
    }
  }

  async remove(id: string, user?: any): Promise<void> {
    const lead = await this.findOne(id, user);
    const assignedUserId = lead?.assignedUserId;
    await this.leadRepository.remove(lead);
    
    // Emit WebSocket event for real-time update
    try {
      this.dataSyncGateway.emitLeadDeleted(id, user?.centerName, assignedUserId);
    } catch (wsError) {
      console.error('Failed to emit lead:deleted event:', wsError);
    }
  }

  async removeBulk(ids: string[], user?: any): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    for (const id of ids) {
      try {
        const lead = await this.findOne(id, user); // Access check enforced
        await this.leadRepository.remove(lead);
        deleted++;
      } catch (e: any) {
        errors.push(`Failed to delete lead ${id}: ${e?.message || 'Unknown error'}`);
      }
    }

    return { deleted, errors };
  }

  // Assignment APIs
  private async ensureCounselorInCenter(counselorId: string, centerName: string | null) {
    const counselor = await this.usersRepo.findOne({ where: { id: counselorId, role: 'counselor', deleted: false } as any });
    if (!counselor) throw new NotFoundException('Counselor not found');
    if ((counselor as any).centerName !== centerName) throw new ForbiddenException('Counselor is not in your center');
    return counselor;
  }

  async assignLead(id: string, assignedUserId: string, user?: any): Promise<Lead> {
  const role = normalizeRole(user?.role, user?.isAdmin);
    if (role !== 'center-manager') throw new ForbiddenException('Only center manager can assign leads');
  const counselor = await this.ensureCounselorInCenter(assignedUserId, user?.centerName || null);
    const lead = await this.findOne(id, user); // access check already enforces center scoping
    const beforeOwner = lead.assignedUserId;
    lead.assignedUserId = counselor.id;
    (lead as any).counselorName = `${counselor.firstName || ''} ${counselor.lastName || ''}`.trim();
  // Use counselor username instead of random code
  (lead as any).counselorCode = counselor.userName || null;
    const saved = await this.leadRepository.save(lead);
    await this.historyRepo.save(
      this.historyRepo.create({
        leadId: saved.id,
        action: beforeOwner ? 'owner_change' : 'assignment',
        changedBy: user?.id ?? null,
        fromValue: beforeOwner ? { assignedUserId: beforeOwner } : undefined,
        toValue: { assignedUserId: counselor.id },
      }),
    );
    
    // Emit WebSocket event for real-time update
    try {
      this.dataSyncGateway.emitLeadAssigned(saved, counselor?.centerName || user?.centerName);
    } catch (wsError) {
      console.error('Failed to emit lead:assigned event:', wsError);
    }
    
    return saved;
  }

  async assignLeadsBulk(ids: string[], assignedUserId: string, user?: any): Promise<{ updated: number; ids: string[] }> {
    const role = String(user?.role || (user?.isAdmin ? 'super-admin' : '')).toLowerCase();
    if (role !== 'center-manager') throw new ForbiddenException('Only center manager can assign leads');
    if (!Array.isArray(ids) || !ids.length) throw new BadRequestException('ids array required');
    const counselor = await this.ensureCounselorInCenter(assignedUserId, user?.centerName || null);
    let updated = 0;
    for (const id of ids) {
      try {
        await this.assignLead(id, counselor.id, user);
        updated++;
      } catch {
        // skip failures; could log
      }
    }
    return { updated, ids };
  }

  // Deprecated: convert pipeline not used in new flow; retain stub if needed
  async convertLead(id: string, user?: any): Promise<Lead> {
    const lead = await this.findOne(id, user);
    lead.leadStatus = 'Converted';
    lead.leadScorePercent = 100;
    await this.historyRepo.save(
      this.historyRepo.create({ leadId: id, action: 'status_change', changedBy: user?.id ?? null, toValue: { leadStatus: 'Converted' } }),
    );
    return await this.leadRepository.save(lead);
  }

  async getLeadsByStatus(status: string, query: LeadQueryDto, user?: any) {
    return this.findAll({ ...query, leadStatus: status } as any, user);
  }

  async getLeadsBySource(leadSource: string, query: LeadQueryDto, user?: any) {
    return this.findAll({ ...query, leadSource } as any, user);
  }

  async getLeadStatistics(user?: any) {
    try {
      const baseQb = this.leadRepository
        .createQueryBuilder('lead')
        .where('lead.deleted = :deleted', { deleted: false });

  const role = normalizeRole(user?.role, user?.isAdmin);
      if (role === 'center-manager') {
        baseQb.andWhere(`lead.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)`, { centerName: user?.centerName || null });
      } else if (role === 'counselor') {
        baseQb.andWhere('lead.assignedUserId = :uid', { uid: user?.id });
      } else {
        // Others not allowed; empty statistics
        return {
          totalLeads: 0,
          convertedLeads: 0,
          leadsWithEmail: 0,
          leadsWithPhone: 0,
          leadsByStatus: [],
          leadsBySource: [],
          leadsByIndustry: [],
          recentLeads: 0,
          conversionPercentage: 0,
          emailLeadPercentage: 0,
          phoneLeadPercentage: 0,
        };
      }

      const [
        totalLeads,
        convertedLeads,
        leadsWithEmail,
        leadsWithPhone,
        leadsByStatus,
        leadsBySource,
        leadsByIndustry,
        recentLeads,
        conversionRate,
      ] = await Promise.all([
        baseQb.clone().getCount(),
        baseQb.clone().andWhere('lead.leadStatus = :status', { status: 'Converted' }).getCount(),
        baseQb.clone().andWhere(`lead.email IS NOT NULL AND lead.email != ''`).getCount(),
        baseQb
          .clone()
          .andWhere(`(lead.phoneWork IS NOT NULL AND lead.phoneWork != '') OR (lead.mobileNumber IS NOT NULL AND lead.mobileNumber != '')`)
          .getCount(),
        baseQb
          .clone()
          .select('lead.leadStatus', 'status')
          .addSelect('COUNT(*)', 'count')
          .andWhere(`lead.leadStatus IS NOT NULL AND lead.leadStatus != ''`)
          .groupBy('lead.leadStatus')
          .orderBy('count', 'DESC')
          .getRawMany(),
        baseQb
          .clone()
          .select('lead.leadSource', 'leadSource')
          .addSelect('COUNT(*)', 'count')
          .andWhere(`lead.leadSource IS NOT NULL AND lead.leadSource != ''`)
          .groupBy('lead.leadSource')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany(),
        baseQb
          .clone()
          .select('lead.industry', 'industry')
          .addSelect('COUNT(*)', 'count')
          .andWhere(`lead.industry IS NOT NULL AND lead.industry != ''`)
          .groupBy('lead.industry')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany(),
        baseQb
          .clone()
          .andWhere('lead.dateEntered >= :thirtyDaysAgo', { thirtyDaysAgo: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) })
          .getCount(),
        baseQb
          .clone()
          .select(`SUM(CASE WHEN lead.leadStatus = 'Converted' THEN 1 ELSE 0 END)`, 'converted')
          .addSelect('COUNT(*)', 'total')
          .getRawOne(),
      ]);

      const totalNum = Number((conversionRate as any)?.total ?? 0);
      const convertedNum = Number((conversionRate as any)?.converted ?? 0);
      const conversionPercentage = totalNum > 0 ? Math.round((convertedNum / totalNum) * 100) : 0;

      return {
        totalLeads,
        convertedLeads,
        leadsWithEmail,
        leadsWithPhone,
        leadsByStatus,
        leadsBySource,
        leadsByIndustry,
        recentLeads,
        conversionPercentage,
        emailLeadPercentage: totalLeads > 0 ? Math.round((leadsWithEmail / totalLeads) * 100) : 0,
        phoneLeadPercentage: totalLeads > 0 ? Math.round((leadsWithPhone / totalLeads) * 100) : 0,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('getLeadStatistics failed:', (err as any)?.message || err);
      return {
        totalLeads: 0,
        convertedLeads: 0,
        leadsWithEmail: 0,
        leadsWithPhone: 0,
        leadsByStatus: [],
        leadsBySource: [],
        leadsByIndustry: [],
        recentLeads: 0,
        conversionPercentage: 0,
        emailLeadPercentage: 0,
        phoneLeadPercentage: 0,
      };
    }
  }

  async searchLeads(searchTerm: string, limit: number = 10, user?: any) {
    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .where(
        `(
          LOWER(lead.firstName) LIKE LOWER(:search) OR
          LOWER(lead.lastName) LIKE LOWER(:search) OR
          LOWER(lead.company) LIKE LOWER(:search) OR
          LOWER(lead.email) LIKE LOWER(:search) OR
          LOWER(lead.referenceNo) LIKE LOWER(:search)
        )`,
        { search: `%${searchTerm}%` },
      )
      .orderBy('lead.dateEntered', 'DESC');

  const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'center-manager') {
      qb.andWhere(`lead.assignedUserId IN (SELECT u.id FROM users u WHERE u.center_name = :centerName)`, { centerName: user?.centerName || null });
    } else if (role === 'counselor') {
      qb.andWhere('lead.assignedUserId = :uid', { uid: user?.id });
    } else {
      return [];
    }

    return qb.limit(limit).getMany();
  }

  async getLeadTimeseries(
    startDate: string,
    endDate: string,
    bucket: 'day' | 'week' | 'month' = 'day',
  ): Promise<Array<{ period: string; count: number; converted: number }>> {
    const allowed: Record<string, 'day' | 'week' | 'month'> = {
      day: 'day',
      week: 'week',
      month: 'month',
    };
    const truncUnit = allowed[bucket] ?? 'day';

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      const now = new Date();
      end.setTime(now.getTime());
      start.setTime(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const qb = this.leadRepository
      .createQueryBuilder('lead')
      .select(`DATE_TRUNC('${truncUnit}', lead.dateEntered)`, 'period')
      .addSelect('COUNT(*)', 'count')
      .addSelect(`SUM(CASE WHEN lead.leadStatus = 'Converted' THEN 1 ELSE 0 END)`, 'converted')
      .where('lead.dateEntered BETWEEN :start AND :end', { start, end })
      .groupBy('period')
      .orderBy('period', 'ASC');

    const rows = await qb.getRawMany();
    return rows.map((r: any) => ({
      period: r.period instanceof Date ? (r.period as Date).toISOString() : String(r.period),
      count: Number(r.count) || 0,
      converted: Number(r.converted) || 0,
    }));
  }

  async getHistory(leadId: string, user?: any) {
    await this.findOne(leadId, user); // access check
    const items = await this.historyRepo.find({ where: { leadId } as any, order: { changedAt: 'DESC' as any } });
    // Enrich owner/assignee user IDs to usernames + roles for readability
    const userIds = new Set<string>();
    for (const h of items) {
      const f = (h as any).fromValue?.assignedUserId; if (f) userIds.add(f);
      const t = (h as any).toValue?.assignedUserId; if (t) userIds.add(t);
      const c = (h as any).changedBy; if (c) userIds.add(c);
    }
    if (userIds.size === 0) return items;
    const users = await this.usersRepo.createQueryBuilder('u')
      .where('u.id IN (:...ids)', { ids: Array.from(userIds) })
      .getMany();
    const map = new Map(users.map(u => [u.id, u]));
    return items.map((h: any) => {
      const fromId = h?.fromValue?.assignedUserId;
      const toId = h?.toValue?.assignedUserId;
      const makeLabel = (u?: User | null) => u ? ((`${u.firstName || ''} ${u.lastName || ''}`.trim()) || u.userName || u.id) + (u.role ? ` (${String(u.role)})` : '') : undefined;
      return {
        ...h,
        fromUser: fromId ? { id: fromId, userName: map.get(fromId)?.userName, name: `${map.get(fromId)?.firstName || ''} ${map.get(fromId)?.lastName || ''}`.trim(), role: map.get(fromId)?.role, label: makeLabel(map.get(fromId)) } : undefined,
        toUser: toId ? { id: toId, userName: map.get(toId)?.userName, name: `${map.get(toId)?.firstName || ''} ${map.get(toId)?.lastName || ''}`.trim(), role: map.get(toId)?.role, label: makeLabel(map.get(toId)) } : undefined,
      };
    });
  }

  // Lead Views
  async listViews(user: any) {
    const uid = user?.id;
    const centerName = user?.centerName || null;
    return this.viewsRepo.find({
      where: [
        { userId: uid } as any,
        { scope: 'center' as any, centerName } as any,
      ],
      order: { isDefault: 'DESC' as any, dateModified: 'DESC' as any },
    });
  }

  async createView(payload: Partial<LeadView>, user: any) {
    const uid = user?.id;
    if (!payload.name || !Array.isArray(payload.selectedFields)) throw new BadRequestException('name and selectedFields are required');
    const scope = (payload as any).scope === 'center' ? 'center' : 'personal';
    if (scope === 'center') {
      const role = String(user?.role || '').toLowerCase();
      if (role !== 'center-manager') throw new ForbiddenException('Only center manager can create center-shared views');
    }
    const view = this.viewsRepo.create({
      userId: uid,
      name: payload.name,
      selectedFields: payload.selectedFields as any,
      filters: (payload.filters as any) ?? {},
      sortBy: payload.sortBy,
      sortOrder: (payload.sortOrder as any) ?? 'DESC',
      isDefault: !!payload.isDefault,
      scope: scope as any,
      centerName: scope === 'center' ? (user?.centerName || null) : null,
    });
    if (view.isDefault) {
      // Only one default per user
      await this.viewsRepo.update({ userId: uid } as any, { isDefault: false } as any);
    }
    return this.viewsRepo.save(view);
  }

  async updateView(id: string, payload: Partial<LeadView>, user: any) {
    const uid = user?.id;
    let view = await this.viewsRepo.findOne({ where: { id, userId: uid } as any });
    if (!view) {
      const role = String(user?.role || '').toLowerCase();
      view = await this.viewsRepo.findOne({ where: { id, scope: 'center' as any, centerName: user?.centerName || null } as any });
      if (!view || role !== 'center-manager') throw new NotFoundException('View not found');
    }
    if (payload.isDefault) {
      await this.viewsRepo.update({ userId: uid } as any, { isDefault: false } as any);
    }
    Object.assign(view, payload);
    return this.viewsRepo.save(view);
  }

  async removeView(id: string, user: any) {
    const uid = user?.id;
    let view = await this.viewsRepo.findOne({ where: { id, userId: uid } as any });
    if (!view) {
      const role = String(user?.role || '').toLowerCase();
      view = await this.viewsRepo.findOne({ where: { id, scope: 'center' as any, centerName: user?.centerName || null } as any });
      if (!view || role !== 'center-manager') throw new NotFoundException('View not found');
    }
    await this.viewsRepo.remove(view);
    return { ok: true };
  }

  async importCsv(buffer: Buffer, user?: any) {
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (!lines.length) return { imported: 0, errors: ['Empty file'], rows: [] };
    const headers = this.parseCsvLine(lines[0]).map((h) => h.trim());
    const requiredHeaders = ['firstName', 'lastName', 'email', 'mobileNumber'];
    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length) return { imported: 0, errors: [`Missing required headers: ${missing.join(', ')}`], rows: [] };

    // Allowed/known headers we map into CreateLeadDto
    const allowed = new Set<string>([
      'firstName','lastName','email','mobileNumber','emailVerified','alternateNumber','mobileVerified','whatsappNumber','whatsappVerified','isImportant',
      'locationCity','locationState','nationality','gender','dateOfBirth','motherTongue','highestQualification','yearOfCompletion','yearsOfExperience','university','program','specialization','batch',
      'leadSource','leadSubSource','createdFrom','leadStatus','leadSubStatus','nextFollowUpAt','leadDescription','reasonDeadInvalid','comment',
      'company','title','industry','website','actionsScore'
    ]);

    const colIndex = (name: string) => headers.indexOf(name);
    const boolFields = new Set(['emailVerified','mobileVerified','whatsappVerified','isImportant']);
    const numFields = new Set(['yearOfCompletion','actionsScore']);
    const dateFields = new Set(['dateOfBirth','nextFollowUpAt']);

    const results: any[] = [];
    const errors: string[] = [];
    const leadsToCreate: any[] = [];
    const historyEntries: any[] = [];

    // Parse all rows first
    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvLine(lines[i]);
      if (row.length === 1 && row[0].trim() === '') continue;

      const dto: any = {};
      for (const h of headers) {
        if (!allowed.has(h)) continue; // ignore unknown columns
        const raw = row[colIndex(h)] ?? '';
        const v = String(raw).trim();
        if (v === '') {
          dto[h] = null; // store empty as null as requested
          continue;
        }
        if (boolFields.has(h)) {
          dto[h] = /^(true|1|yes)$/i.test(v);
        } else if (numFields.has(h)) {
          const n = Number(v);
          dto[h] = Number.isFinite(n) ? n : null;
        } else if (dateFields.has(h)) {
          dto[h] = v; // parsed later
        } else {
          dto[h] = v;
        }
      }

      // Defaults and normalization
      if (!dto.leadStatus) dto.leadStatus = 'New';
      dto.lineNumber = i + 1;
      leadsToCreate.push(dto);
    }

    // Generate unique reference numbers before processing
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const prefix = `LD${yy}${mm}`;
    
    // Get the highest existing reference number for this month
    const latestLead = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.referenceNo LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('lead.referenceNo', 'DESC')
      .limit(1)
      .getOne();
    
    let nextSeq = 1;
    if (latestLead?.referenceNo) {
      const lastSeq = parseInt(latestLead.referenceNo.slice(-4), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    // Batch insert leads using chunks of 50 for better performance
    const CHUNK_SIZE = 50;
    for (let i = 0; i < leadsToCreate.length; i += CHUNK_SIZE) {
      const chunk = leadsToCreate.slice(i, i + CHUNK_SIZE);
      
      // Process each lead in chunk
      const chunkPromises = chunk.map(async (dto) => {
        try {
          // Generate unique reference number (sequential within import)
          const referenceNo = `${prefix}${String(nextSeq++).padStart(4, '0')}`;

          // Parse dates
          let dob: Date | null = null;
          let followUp: Date | null = null;
          if (dto.dateOfBirth) {
            const parsed = new Date(dto.dateOfBirth);
            if (!isNaN(parsed.getTime())) dob = parsed;
          }
          if (dto.nextFollowUpAt) {
            const parsed = new Date(dto.nextFollowUpAt);
            if (!isNaN(parsed.getTime())) followUp = parsed;
          }

          const lead = this.leadRepository.create({
            ...dto,
            referenceNo,
            dateOfBirth: dob,
            nextFollowUpAt: followUp,
            createdBy: user?.id ?? null,
            // For center-manager imports, assign to self so leads appear in their list
            assignedUserId: normalizeRole(user?.role, user?.isAdmin) === 'center-manager' ? user?.id : null,
          });

          const saved = (await this.leadRepository.save(lead)) as unknown as Lead;
          
          return {
            success: true,
            line: dto.lineNumber,
            id: saved.id,
            referenceNo: saved.referenceNo,
          };
        } catch (e: any) {
          return {
            success: false,
            line: dto.lineNumber,
            error: (e?.message as string) || 'Failed to import',
          };
        }
      });

      const chunkResults = await Promise.all(chunkPromises);
      
      for (const result of chunkResults) {
        if (result.success) {
          results.push({ line: result.line, id: result.id, referenceNo: result.referenceNo });
          historyEntries.push(
            this.historyRepo.create({ 
              leadId: result.id, 
              action: 'import', 
              changedBy: user?.id ?? null, 
              note: 'Imported via CSV' 
            })
          );
        } else {
          errors.push(`Line ${result.line}: ${result.error}`);
        }
      }
    }

    // Batch insert history entries
    if (historyEntries.length > 0) {
      try {
        await this.historyRepo.save(historyEntries);
      } catch (e) {
        console.error('Failed to batch insert history entries:', e);
      }
    }

    return { imported: results.length, errors, rows: results };
  }

  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    out.push(current);
    return out;
  }
}