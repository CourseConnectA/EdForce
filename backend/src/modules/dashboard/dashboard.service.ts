import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';

interface RoleContext {
  role: 'super-admin'|'center-manager'|'counselor';
  centerName: string | null;
  userId: string;
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  async getRoleAwareStats(ctx: RoleContext) {
    if (ctx.role === 'super-admin') {
      return this.getSuperAdminStats();
    }
    if (ctx.role === 'center-manager') {
      return this.getCenterManagerStats(ctx.centerName || '');
    }
    return this.getCounselorStats(ctx.userId);
  }

  private async getSuperAdminStats() {
      // Success outcomes treated as "qualified" leads in dashboards
      const QUALIFIED_STATUSES = [
        'Closed - Won',
        'Registration Fee Paid',
        'Reg Fee Paid & Documents Uploaded',
        'Documents Approved',
        'Semester fee paid',
        'Yearly fee paid',
        'Full fee paid - Lumpsum',
        'Full fee paid - Loan',
        'Admission Fee Paid',
      ];
    // Count centers based on center managers; fallback to counselor centers as well
    const managerCenters = await this.users.createQueryBuilder('u')
      .select('DISTINCT u.center_name', 'centerName')
      .where("u.role = 'center-manager'")
      .andWhere("u.center_name IS NOT NULL AND u.center_name != ''")
      .getRawMany();

    const counselorCenters = await this.users.createQueryBuilder('u')
      .select('DISTINCT u.center_name', 'centerName')
      .where("u.role = 'counselor'")
      .andWhere("u.center_name IS NOT NULL AND u.center_name != ''")
      .getRawMany();

    const centersSet = new Set<string>([...managerCenters, ...counselorCenters].map((r: any) => r.centerName).filter(Boolean));
    const centers = Array.from(centersSet.values());

    // Aggregate leads per center inferred by counselors' center_name
    const centerPerformance = [] as Array<{ centerName: string; totalLeads: number; qualifiedLeads: number; programWise: Array<{ program: string; count: number }> }>;
    for (const c of centers) {
      const counselorIds = await this.users.createQueryBuilder('u')
        .select('u.id', 'id')
        .where("u.role = 'counselor'")
        .andWhere('u.center_name = :c', { c })
        .getRawMany();
      const ids = counselorIds.map((r: any) => r.id);
      if (ids.length === 0) {
        centerPerformance.push({ centerName: c, totalLeads: 0, qualifiedLeads: 0, programWise: [] });
        continue;
      }
      const totalLeads = await this.leads.count({ where: { assignedUserId: In(ids) } as any });
        const qualifiedLeads = await this.leads.count({ where: { assignedUserId: In(ids), leadStatus: In(QUALIFIED_STATUSES) } as any });
      const programRows = await this.leads.createQueryBuilder('l')
        .select('COALESCE(NULLIF(l.program, \'\'), \'Unknown\')', 'program')
        .addSelect('COUNT(*)', 'count')
        .where('l.assigned_user_id IN (:...ids)', { ids })
        .groupBy('program')
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();
      centerPerformance.push({ centerName: c, totalLeads, qualifiedLeads, programWise: programRows.map((r: any) => ({ program: r.program, count: Number(r.count) || 0 })) });
    }

    // Global program-wise distribution across all leads
    const globalProgramRows = await this.leads.createQueryBuilder('l')
      .select('COALESCE(NULLIF(l.program, \'\'), \'Unknown\')', 'program')
      .addSelect('COUNT(*)', 'count')
      .groupBy('program')
      .orderBy('count', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      role: 'super-admin',
      totalCenters: centers.length,
      centers,
      centerPerformance,
      leads: {
        totalLeads: await this.leads.count(),
        qualifiedLeads: await this.leads.count({ where: { leadStatus: In(QUALIFIED_STATUSES) } as any }),
      },
      programWiseGlobal: globalProgramRows.map((r: any) => ({ program: r.program, count: Number(r.count) || 0 })),
    };
  }

  private async getCenterManagerStats(centerName: string) {
      const QUALIFIED_STATUSES = [
        'Closed - Won',
        'Registration Fee Paid',
        'Reg Fee Paid & Documents Uploaded',
        'Documents Approved',
        'Semester fee paid',
        'Yearly fee paid',
        'Full fee paid - Lumpsum',
        'Full fee paid - Loan',
        'Admission Fee Paid',
      ];
    // Counselors in this center
    const counselors = await this.users.find({ where: { role: 'counselor', centerName } as any });
    const counselorIds = counselors.map(c => c.id);
    const counselorsCount = counselors.length;

    // Leads in this center via counselors
    let totalLeads = 0;
    let qualifiedLeads = 0;
    if (counselorIds.length > 0) {
      totalLeads = await this.leads.count({ where: { assignedUserId: In(counselorIds) } as any });
    qualifiedLeads = await this.leads.count({ where: { assignedUserId: In(counselorIds), leadStatus: In(QUALIFIED_STATUSES) } as any });
    }

    // Program-wise counts
    const programRows = counselorIds.length > 0
    ? await this.leads.createQueryBuilder('l')
      .select('COALESCE(NULLIF(l.program, \'\'), \'Unknown\')', 'program')
          .addSelect('COUNT(*)', 'count')
          .where('l.assigned_user_id IN (:...ids)', { ids: counselorIds })
          .groupBy('program')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany()
      : [];

    // Counselor-wise performance
    const counselorPerformance = [] as Array<{ userId: string; userName: string; totalLeads: number; qualifiedLeads: number }>;
    for (const c of counselors) {
      const cTotal = await this.leads.count({ where: { assignedUserId: c.id } as any });
        const cQualified = await this.leads.count({ where: { assignedUserId: c.id, leadStatus: In(QUALIFIED_STATUSES) } as any });
      counselorPerformance.push({ userId: c.id, userName: c.userName, totalLeads: cTotal, qualifiedLeads: cQualified });
    }

    return {
      role: 'center-manager',
      centerName,
      counselorsCount,
      leads: { totalLeads, qualifiedLeads },
      programWise: programRows.map((r: any) => ({ program: r.program, count: Number(r.count) || 0 })),
      counselorPerformance,
    };
  }

  private async getCounselorStats(userId: string) {
      const QUALIFIED_STATUSES = [
        'Closed - Won',
        'Registration Fee Paid',
        'Reg Fee Paid & Documents Uploaded',
        'Documents Approved',
        'Semester fee paid',
        'Yearly fee paid',
        'Full fee paid - Lumpsum',
        'Full fee paid - Loan',
        'Admission Fee Paid',
      ];
    const totalLeads = await this.leads.count({ where: { assignedUserId: userId } as any });
      const qualifiedLeads = await this.leads.count({ where: { assignedUserId: userId, leadStatus: In(QUALIFIED_STATUSES) } as any });

    const programRows = await this.leads.createQueryBuilder('l')
      .select('COALESCE(NULLIF(l.program, \'\'), \'Unknown\')', 'program')
      .addSelect('COUNT(*)', 'count')
      .where('l.assigned_user_id = :id', { id: userId })
      .groupBy('program')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Follow-ups for the day (assumption): leads updated today and not converted
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const followUpsToday = await this.leads.createQueryBuilder('l')
      .where('l.assigned_user_id = :id', { id: userId })
      .andWhere('l.lead_status != :converted', { converted: 'Converted' })
      .andWhere('l.date_modified >= :start', { start: startOfDay })
      .getCount();

    return {
      role: 'counselor',
      leads: { totalLeads, qualifiedLeads },
      programWise: programRows.map((r: any) => ({ program: r.program, count: Number(r.count) || 0 })),
      followUpsToday,
    };
  }
}
