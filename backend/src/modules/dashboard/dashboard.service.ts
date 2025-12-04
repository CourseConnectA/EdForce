import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';

interface RoleContext {
  role: 'super-admin'|'center-manager'|'counselor';
  centerName: string | null;
  userId: string;
}

interface DateFilterOptions {
  dateFilter?: string;
  startDate?: string;
  endDate?: string;
  counselorId?: string; // For center-manager to filter by counselor
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Lead) private leads: Repository<Lead>,
    @InjectRepository(User) private users: Repository<User>,
  ) {}

  private getDateRange(options: DateFilterOptions): { start: Date; end: Date } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    switch (options.dateFilter) {
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      }
      case 'past_week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo, end: tomorrow };
      }
      case 'past_month': {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo, end: tomorrow };
      }
      case 'custom': {
        const start = options.startDate ? new Date(options.startDate) : today;
        const end = options.endDate ? new Date(options.endDate) : tomorrow;
        end.setDate(end.getDate() + 1); // Include the end date
        return { start, end };
      }
      case 'today':
      default:
        return { start: today, end: tomorrow };
    }
  }

  async getRoleAwareStats(ctx: RoleContext, dateOptions: DateFilterOptions = {}) {
    if (ctx.role === 'super-admin') {
      return this.getSuperAdminStats();
    }
    if (ctx.role === 'center-manager') {
      return this.getCenterManagerStats(ctx.centerName || '', dateOptions);
    }
    return this.getCounselorStats(ctx.userId, dateOptions);
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

    // Total leads and qualified leads globally
    const totalLeads = await this.leads.count({ where: { deleted: false } as any });
    const qualifiedLeads = await this.leads.count({ where: { deleted: false, leadStatus: In(QUALIFIED_STATUSES) } as any });

    // Center-wise performance with more insights
    const centerPerformance = [] as Array<{ 
      centerName: string; 
      totalLeads: number; 
      qualifiedLeads: number; 
      counselorCount: number;
      conversionRate: number;
      leadsThisMonth: number;
    }>;
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    for (const c of centers) {
      const counselors = await this.users.find({ where: { role: 'counselor', centerName: c } as any });
      const counselorIds = counselors.map((u: any) => u.id);
      const counselorCount = counselors.length;
      
      if (counselorIds.length === 0) {
        centerPerformance.push({ 
          centerName: c, 
          totalLeads: 0, 
          qualifiedLeads: 0, 
          counselorCount: 0,
          conversionRate: 0,
          leadsThisMonth: 0,
        });
        continue;
      }
      
      const cTotalLeads = await this.leads.count({ where: { assignedUserId: In(counselorIds), deleted: false } as any });
      const cQualifiedLeads = await this.leads.count({ where: { assignedUserId: In(counselorIds), deleted: false, leadStatus: In(QUALIFIED_STATUSES) } as any });
      
      // Leads this month
      const leadsThisMonth = await this.leads.createQueryBuilder('l')
        .where('l.assigned_user_id IN (:...ids)', { ids: counselorIds })
        .andWhere('l.deleted = false')
        .andWhere('l.date_entered >= :start', { start: startOfMonth })
        .getCount();

      const conversionRate = cTotalLeads > 0 ? Math.round((cQualifiedLeads / cTotalLeads) * 100) : 0;
      
      centerPerformance.push({ 
        centerName: c, 
        totalLeads: cTotalLeads, 
        qualifiedLeads: cQualifiedLeads, 
        counselorCount,
        conversionRate,
        leadsThisMonth,
      });
    }

    // Sort by total leads descending
    centerPerformance.sort((a, b) => b.totalLeads - a.totalLeads);

    // Lead status distribution globally
    const statusDistribution = await this.leads.createQueryBuilder('l')
      .select('l.lead_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('l.deleted = false')
      .groupBy('l.lead_status')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Leads trend - last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const leadsTrend = await this.leads.createQueryBuilder('l')
      .select("TO_CHAR(l.date_entered, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('l.deleted = false')
      .andWhere('l.date_entered >= :start', { start: sevenDaysAgo })
      .groupBy("TO_CHAR(l.date_entered, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    // Total counselors across all centers
    const totalCounselors = await this.users.count({ where: { role: 'counselor' } as any });

    return {
      role: 'super-admin',
      totalCenters: centers.length,
      totalCounselors,
      leads: {
        totalLeads,
        qualifiedLeads,
        conversionRate: totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0,
      },
      centerPerformance,
      statusDistribution: statusDistribution.map((r: any) => ({ status: r.status || 'Unknown', count: Number(r.count) || 0 })),
      leadsTrend: leadsTrend.map((r: any) => ({ date: r.date, count: Number(r.count) || 0 })),
    };
  }

  private async getCenterManagerStats(centerName: string, dateOptions: DateFilterOptions = {}) {
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

    // Determine which counselor IDs to use for stats (filtered or all)
    const targetCounselorIds = dateOptions.counselorId 
      ? counselorIds.filter(id => id === dateOptions.counselorId)
      : counselorIds;

    // Leads in this center via counselors
    let totalLeads = 0;
    let qualifiedLeadsCount = 0;
    if (targetCounselorIds.length > 0) {
      totalLeads = await this.leads.count({ where: { assignedUserId: In(targetCounselorIds), deleted: false } as any });
      qualifiedLeadsCount = await this.leads.count({ where: { assignedUserId: In(targetCounselorIds), deleted: false, leadStatus: In(QUALIFIED_STATUSES) } as any });
    }

    // Program-wise counts
    const programRows = targetCounselorIds.length > 0
    ? await this.leads.createQueryBuilder('l')
      .select('COALESCE(NULLIF(l.program, \'\'), \'Unknown\')', 'program')
          .addSelect('COUNT(*)', 'count')
          .where('l.assigned_user_id IN (:...ids)', { ids: targetCounselorIds })
          .andWhere('l.deleted = false')
          .groupBy('program')
          .orderBy('count', 'DESC')
          .limit(10)
          .getRawMany()
      : [];

    // Counselor-wise performance (all counselors for dropdown)
    const counselorPerformance = [] as Array<{ userId: string; userName: string; totalLeads: number; qualifiedLeads: number; followUpsToday: number; overdueFollowUps: number }>;
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    for (const c of counselors) {
      const cTotal = await this.leads.count({ where: { assignedUserId: c.id, deleted: false } as any });
      const cQualified = await this.leads.count({ where: { assignedUserId: c.id, deleted: false, leadStatus: In(QUALIFIED_STATUSES) } as any });
      
      const cTodayFollowUps = await this.leads.createQueryBuilder('l')
        .where('l.assigned_user_id = :id', { id: c.id })
        .andWhere('l.deleted = false')
        .andWhere('l.next_follow_up_at >= :start', { start: todayStart })
        .andWhere('l.next_follow_up_at < :end', { end: tomorrowStart })
        .getCount();
      
      const cOverdue = await this.leads.createQueryBuilder('l')
        .where('l.assigned_user_id = :id', { id: c.id })
        .andWhere('l.deleted = false')
        .andWhere('l.next_follow_up_at < :today', { today: todayStart })
        .andWhere('l.next_follow_up_at IS NOT NULL')
        .getCount();

      counselorPerformance.push({ 
        userId: c.id, 
        userName: c.userName, 
        totalLeads: cTotal, 
        qualifiedLeads: cQualified,
        followUpsToday: cTodayFollowUps,
        overdueFollowUps: cOverdue,
      });
    }

    // Get follow-ups data for the filtered counselor(s)
    // Today's follow-ups list
    const todayFollowUpsList = targetCounselorIds.length > 0 
      ? await this.leads.createQueryBuilder('l')
        .select([
          'l.id',
          'l.firstName',
          'l.lastName',
          'l.mobileNumber',
          'l.email',
          'l.leadStatus',
          'l.leadSubStatus',
          'l.nextFollowUpAt',
          'l.program',
          'l.leadDescription',
          'l.assignedUserId',
        ])
        .where('l.assigned_user_id IN (:...ids)', { ids: targetCounselorIds })
        .andWhere('l.deleted = false')
        .andWhere('l.next_follow_up_at >= :start', { start: todayStart })
        .andWhere('l.next_follow_up_at < :end', { end: tomorrowStart })
        .orderBy('l.next_follow_up_at', 'ASC')
        .getMany()
      : [];

    // Overdue follow-ups list
    const overdueFollowUpsList = targetCounselorIds.length > 0
      ? await this.leads.createQueryBuilder('l')
        .select([
          'l.id',
          'l.firstName',
          'l.lastName',
          'l.mobileNumber',
          'l.email',
          'l.leadStatus',
          'l.leadSubStatus',
          'l.nextFollowUpAt',
          'l.program',
          'l.leadDescription',
          'l.assignedUserId',
        ])
        .where('l.assigned_user_id IN (:...ids)', { ids: targetCounselorIds })
        .andWhere('l.deleted = false')
        .andWhere('l.next_follow_up_at < :today', { today: todayStart })
        .andWhere('l.next_follow_up_at IS NOT NULL')
        .orderBy('l.next_follow_up_at', 'ASC')
        .getMany()
      : [];

    // Qualified leads list
    const qualifiedLeadsList = targetCounselorIds.length > 0
      ? await this.leads.createQueryBuilder('l')
        .select([
          'l.id',
          'l.firstName',
          'l.lastName',
          'l.mobileNumber',
          'l.email',
          'l.leadStatus',
          'l.leadSubStatus',
          'l.nextFollowUpAt',
          'l.program',
          'l.leadDescription',
          'l.assignedUserId',
        ])
        .where('l.assigned_user_id IN (:...ids)', { ids: targetCounselorIds })
        .andWhere('l.deleted = false')
        .andWhere('l.lead_status IN (:...statuses)', { statuses: QUALIFIED_STATUSES })
        .orderBy('l.date_entered', 'DESC')
        .limit(50)
        .getMany()
      : [];

    // Create counselor map for displaying names
    const counselorMap = new Map(counselors.map(c => [c.id, c.userName]));

    const mapLead = (l: Lead) => ({
      id: l.id,
      name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unknown',
      mobileNumber: l.mobileNumber,
      email: l.email,
      leadStatus: l.leadStatus,
      leadSubStatus: l.leadSubStatus,
      nextFollowUpAt: l.nextFollowUpAt,
      program: l.program,
      description: l.leadDescription,
      counselorName: counselorMap.get(l.assignedUserId) || 'Unknown',
    });

    return {
      role: 'center-manager',
      centerName,
      counselorsCount,
      leads: { totalLeads, qualifiedLeads: qualifiedLeadsCount },
      programWise: programRows.map((r: any) => ({ program: r.program, count: Number(r.count) || 0 })),
      counselorPerformance,
      // Follow-ups data
      followUpsToday: todayFollowUpsList.length,
      overdueFollowUps: overdueFollowUpsList.length,
      todayFollowUpsList: todayFollowUpsList.map(mapLead),
      overdueFollowUpsList: overdueFollowUpsList.map(mapLead),
      qualifiedLeadsList: qualifiedLeadsList.map(mapLead),
      selectedCounselorId: dateOptions.counselorId || null,
    };
  }

  private async getCounselorStats(userId: string, dateOptions: DateFilterOptions = {}) {
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
    const totalLeads = await this.leads.count({ where: { assignedUserId: userId, deleted: false } as any });
    const qualifiedLeadsCount = await this.leads.count({ where: { assignedUserId: userId, deleted: false, leadStatus: In(QUALIFIED_STATUSES) } as any });

    // Get date range for follow-ups
    const { start, end } = this.getDateRange(dateOptions);

    // Follow-ups list - leads with nextFollowUpAt in the date range
    const followUps = await this.leads.createQueryBuilder('l')
      .select([
        'l.id',
        'l.firstName',
        'l.lastName',
        'l.mobileNumber',
        'l.email',
        'l.leadStatus',
        'l.leadSubStatus',
        'l.nextFollowUpAt',
        'l.program',
        'l.leadDescription',
      ])
      .where('l.assigned_user_id = :id', { id: userId })
      .andWhere('l.deleted = false')
      .andWhere('l.next_follow_up_at >= :start', { start })
      .andWhere('l.next_follow_up_at < :end', { end })
      .orderBy('l.next_follow_up_at', 'ASC')
      .getMany();

    // Count of follow-ups for each period (for quick stats)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    
    // Today's follow-ups list
    const todayFollowUpsList = await this.leads.createQueryBuilder('l')
      .select([
        'l.id',
        'l.firstName',
        'l.lastName',
        'l.mobileNumber',
        'l.email',
        'l.leadStatus',
        'l.leadSubStatus',
        'l.nextFollowUpAt',
        'l.program',
        'l.leadDescription',
      ])
      .where('l.assigned_user_id = :id', { id: userId })
      .andWhere('l.deleted = false')
      .andWhere('l.next_follow_up_at >= :start', { start: todayStart })
      .andWhere('l.next_follow_up_at < :end', { end: tomorrowStart })
      .orderBy('l.next_follow_up_at', 'ASC')
      .getMany();

    // Overdue follow-ups list (before today)
    const overdueFollowUpsList = await this.leads.createQueryBuilder('l')
      .select([
        'l.id',
        'l.firstName',
        'l.lastName',
        'l.mobileNumber',
        'l.email',
        'l.leadStatus',
        'l.leadSubStatus',
        'l.nextFollowUpAt',
        'l.program',
        'l.leadDescription',
      ])
      .where('l.assigned_user_id = :id', { id: userId })
      .andWhere('l.deleted = false')
      .andWhere('l.next_follow_up_at < :today', { today: todayStart })
      .andWhere('l.next_follow_up_at IS NOT NULL')
      .orderBy('l.next_follow_up_at', 'ASC')
      .getMany();

    // Qualified leads list
    const qualifiedLeadsList = await this.leads.createQueryBuilder('l')
      .select([
        'l.id',
        'l.firstName',
        'l.lastName',
        'l.mobileNumber',
        'l.email',
        'l.leadStatus',
        'l.leadSubStatus',
        'l.nextFollowUpAt',
        'l.program',
        'l.leadDescription',
      ])
      .where('l.assigned_user_id = :id', { id: userId })
      .andWhere('l.deleted = false')
      .andWhere('l.lead_status IN (:...statuses)', { statuses: QUALIFIED_STATUSES })
      .orderBy('l.date_entered', 'DESC')
      .limit(50)
      .getMany();

    const mapLead = (l: Lead) => ({
      id: l.id,
      name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || 'Unknown',
      mobileNumber: l.mobileNumber,
      email: l.email,
      leadStatus: l.leadStatus,
      leadSubStatus: l.leadSubStatus,
      nextFollowUpAt: l.nextFollowUpAt,
      program: l.program,
      description: l.leadDescription,
    });

    return {
      role: 'counselor',
      leads: { totalLeads, qualifiedLeads: qualifiedLeadsCount },
      followUpsToday: todayFollowUpsList.length,
      overdueFollowUps: overdueFollowUpsList.length,
      followUps: followUps.map(mapLead),
      todayFollowUpsList: todayFollowUpsList.map(mapLead),
      overdueFollowUpsList: overdueFollowUpsList.map(mapLead),
      qualifiedLeadsList: qualifiedLeadsList.map(mapLead),
      dateFilter: dateOptions.dateFilter || 'today',
    };
  }
}
