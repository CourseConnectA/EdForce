import { BadRequestException, ForbiddenException, Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CallLog } from '../../database/entities/call-log.entity';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { normalizeRole } from '../../common/role.util';
import { DataSyncGateway } from '../../gateways/data-sync.gateway';

@Injectable()
export class CallsService {
  constructor(
    @InjectRepository(CallLog) private callRepo: Repository<CallLog>,
    @InjectRepository(Lead) private leadRepo: Repository<Lead>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @Inject(forwardRef(() => DataSyncGateway))
    private dataSyncGateway: DataSyncGateway,
  ) {}

  private mapCallLog(log: CallLog & { user?: User }): any {
    if (!log) return null;

    const user = (log as any).user as User | undefined;
    const normalizedRole = normalizeRole(user?.role, user?.isAdmin);
    const roleLabel = normalizedRole
      ? normalizedRole.replace(/[-_]/g, ' ')
      : undefined;
    const trimmedName = user
      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.userName
      : null;
    const friendlyStatus = this.deriveCallStatus(log);

    return {
      id: log.id,
      leadId: log.leadId,
      userId: log.userId,
      userName: trimmedName || 'Unknown',
      userRole: normalizedRole,
      userRoleLabel: roleLabel ? roleLabel.replace(/\b\w/g, (c) => c.toUpperCase()) : null,
      phoneNumber: log.phoneNumber,
      callType: log.callType,
      startTime: log.startTime,
      endTime: log.endTime,
      duration: log.duration,
      disposition: log.disposition,
      notes: log.notes,
      status: friendlyStatus,
      centerName: log.centerName,
      synced: log.synced,
      deviceCallLogId: log.deviceCallLogId,
      createdAt: log.dateEntered,
      updatedAt: log.dateModified,
    };
  }

  private deriveCallStatus(log: CallLog): string {
    if (log.disposition) {
      return log.disposition;
    }

    if (log.callType === 'missed') {
      return 'Missed';
    }

    if (log.duration && log.duration > 0) {
      return 'Connected';
    }

    return 'Not Connected';
  }

  // Log a call from device
  async logCall(user: any, dto: {
    leadId?: string;
    phoneNumber: string;
    callType: 'outgoing' | 'incoming' | 'missed';
    startTime: Date | string;
    endTime?: Date | string;
    duration?: number;
    deviceCallLogId?: string;
    disposition?: string;
    notes?: string;
  }) {
    let leadId = dto.leadId;
    let lead: Lead | null = null;

    // If no leadId provided (incoming call), try to find lead by phone number
    if (!leadId && dto.phoneNumber) {
      const normalizedPhone = this.normalizePhoneNumber(dto.phoneNumber);
      const last10 = normalizedPhone.slice(-10);
      console.log(`Looking for lead with phone: ${dto.phoneNumber} -> normalized: ${normalizedPhone}`);

      // Robust normalization in SQL using Postgres REGEXP_REPLACE to strip all non-digits
      // Matches any of the stored numbers when normalized equals or ends-with last 10 digits
      const qb = this.leadRepo.createQueryBuilder('lead')
        .where('lead.deleted = :del', { del: false })
        .andWhere(
          `(
            REGEXP_REPLACE(COALESCE(lead.mobile_number, ''), '[^0-9]', '', 'g') LIKE :fullSuffix
            OR REGEXP_REPLACE(COALESCE(lead.alternate_number, ''), '[^0-9]', '', 'g') LIKE :fullSuffix
            OR REGEXP_REPLACE(COALESCE(lead.whatsapp_number, ''), '[^0-9]', '', 'g') LIKE :fullSuffix
            OR REGEXP_REPLACE(COALESCE(lead.mobile_number, ''), '[^0-9]', '', 'g') LIKE :last10Suffix
            OR REGEXP_REPLACE(COALESCE(lead.alternate_number, ''), '[^0-9]', '', 'g') LIKE :last10Suffix
            OR REGEXP_REPLACE(COALESCE(lead.whatsapp_number, ''), '[^0-9]', '', 'g') LIKE :last10Suffix
          )`,
          {
            fullSuffix: `%${normalizedPhone}`,
            last10Suffix: `%${last10}`,
          }
        )
        .orderBy('lead.date_modified', 'DESC')
        .limit(1);
      
      lead = await qb.getOne();
      if (lead) {
        leadId = lead.id;
        console.log(`Found lead ${leadId} (mobile: ${lead.mobileNumber}) by phone number ${dto.phoneNumber}`);
      } else {
        console.log(`No lead found for phone number ${dto.phoneNumber} (normalized: ${normalizedPhone}) - skipping incoming call log`);
        return null; // Don't log calls from unknown numbers
      }
    } else if (leadId) {
      // Check if lead exists and user has access
      lead = await this.leadRepo.findOne({ where: { id: leadId, deleted: false } as any });
      if (!lead) throw new BadRequestException('Lead not found');
    }

    if (!lead || !leadId) {
      return null;
    }

    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'counselor' && lead.assignedUserId !== user?.id) {
      // For incoming calls, allow logging even if not assigned (lead called counselor)
      if (dto.callType !== 'incoming' && dto.callType !== 'missed') {
        throw new ForbiddenException('No permission to log call for this lead');
      }
    }
    if (role === 'center-manager') {
      // Verify lead belongs to center
      const leadOwner = lead.assignedUserId ? await this.userRepo.findOne({ where: { id: lead.assignedUserId } as any }) : null;
      const leadCenter = leadOwner?.centerName || null;
      if (leadCenter !== (user?.centerName || null)) {
        // For incoming calls, allow logging
        if (dto.callType !== 'incoming' && dto.callType !== 'missed') {
          throw new ForbiddenException('No permission to log call for this lead');
        }
      }
    }

    // Check for duplicate by deviceCallLogId
    if (dto.deviceCallLogId) {
      const existing = await this.callRepo.findOne({ where: { deviceCallLogId: dto.deviceCallLogId } as any });
      if (existing) {
        console.log(`Call log already exists with deviceCallLogId ${dto.deviceCallLogId}, returning existing record`);
        return this.mapCallLog(existing);
      }
    }

    // Secondary deduplication: check for recent call to same lead/phone within 60 seconds
    // This prevents duplicates from race conditions where deviceCallLogId might not be set
    const startTimeDate = new Date(dto.startTime);
    const startTimeWindow = new Date(startTimeDate.getTime() - 60000); // 60 seconds before
    const endTimeWindow = new Date(startTimeDate.getTime() + 60000); // 60 seconds after
    
    const recentCall = await this.callRepo.createQueryBuilder('call')
      .where('call.leadId = :leadId', { leadId })
      .andWhere('call.phoneNumber = :phoneNumber', { phoneNumber: dto.phoneNumber })
      .andWhere('call.startTime BETWEEN :startWindow AND :endWindow', { 
        startWindow: startTimeWindow,
        endWindow: endTimeWindow
      })
      .andWhere('call.deleted = :deleted', { deleted: false })
      .orderBy('call.dateEntered', 'DESC')
      .getOne();

    if (recentCall) {
      console.log(`Found recent call log for lead ${leadId} within 60s window, returning existing record`);
      const hydrated = await this.callRepo.findOne({
        where: { id: recentCall.id } as any,
        relations: ['user'],
      });
      return this.mapCallLog((hydrated ?? recentCall) as CallLog & { user?: User });
    }

    const callLog = this.callRepo.create({
      leadId,
      userId: user?.id,
      phoneNumber: dto.phoneNumber,
      callType: dto.callType,
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : null,
      duration: dto.duration || 0,
      deviceCallLogId: dto.deviceCallLogId || null,
      disposition: dto.disposition || null,
      notes: dto.notes || null,
      centerName: user?.centerName || null,
      synced: true,
      createdBy: user?.id,
    } as any);

    const persisted = await this.callRepo.save(callLog);
    const saved = Array.isArray(persisted) ? persisted[0] : persisted;
    const hydrated = await this.callRepo.findOne({
      where: { id: saved.id } as any,
      relations: ['user'],
    });
    const payload = this.mapCallLog((hydrated ?? saved) as CallLog & { user?: User });

    // Emit WebSocket event for real-time update
    try {
      this.dataSyncGateway.emitCallLogged(payload, user?.centerName);
    } catch (wsError) {
      console.error('Failed to emit call:logged event:', wsError);
    }
    
    return payload;
  }

  // Normalize phone number for matching (remove non-digits, handle country codes)
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let normalized = phone.replace(/\D/g, '');
    // Remove leading country code if present (91 for India, 1 for US, etc.)
    if (normalized.length > 10) {
      // Keep last 10 digits
      normalized = normalized.slice(-10);
    }
    return normalized;
  }

  // Get call logs for a lead
  async getCallLogsForLead(user: any, leadId: string) {
    const lead = await this.leadRepo.findOne({ where: { id: leadId, deleted: false } as any });
    if (!lead) throw new BadRequestException('Lead not found');

    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'counselor' && lead.assignedUserId !== user?.id) {
      throw new ForbiddenException('No permission');
    }
    if (role === 'center-manager') {
      const leadOwner = lead.assignedUserId ? await this.userRepo.findOne({ where: { id: lead.assignedUserId } as any }) : null;
      const leadCenter = leadOwner?.centerName || null;
      if (leadCenter !== (user?.centerName || null)) {
        throw new ForbiddenException('No permission');
      }
    }

    const logs = await this.callRepo.find({
      where: { leadId, deleted: false } as any,
      order: { startTime: 'DESC' as any },
      relations: ['user'],
    });

    return logs.map((log) => this.mapCallLog(log));
  }

  // Update disposition and notes after call
  async updateDisposition(user: any, callId: string, dto: { disposition?: string; notes?: string }) {
    const call = await this.callRepo.findOne({ where: { id: callId, deleted: false } as any });
    if (!call) throw new BadRequestException('Call log not found');

    // Only the user who made the call can update disposition
    if (call.userId !== user?.id) {
      const role = normalizeRole(user?.role, user?.isAdmin);
      if (role !== 'super-admin') {
        throw new ForbiddenException('No permission to update this call log');
      }
    }

    if (dto.disposition !== undefined) call.disposition = dto.disposition;
    if (dto.notes !== undefined) call.notes = dto.notes;
    call.modifiedBy = user?.id;
    const persisted = await this.callRepo.save(call);
    const saved = Array.isArray(persisted) ? persisted[0] : persisted;
    const hydrated = await this.callRepo.findOne({
      where: { id: saved.id } as any,
      relations: ['user'],
    });
    const payload = this.mapCallLog((hydrated ?? saved) as CallLog & { user?: User });

    try {
      // Get the centerName from the call record or the user
      const centerName = (hydrated as any)?.centerName || (saved as any)?.centerName || user?.centerName;
      this.dataSyncGateway.emitCallLogged(payload, centerName);
    } catch (wsError) {
      console.error('Failed to emit call:logged event after update:', wsError);
    }

    return payload;
  }

  // Get analytics: daily/monthly call stats with direction breakdown
  async getAnalytics(user: any, query: { period?: 'daily' | 'monthly'; startDate?: string; endDate?: string }) {
    const role = normalizeRole(user?.role, user?.isAdmin);
    const period = query.period || 'daily';
    const now = new Date();
    const startDate = query.startDate ? new Date(query.startDate) : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : now;

    const qb = this.callRepo.createQueryBuilder('call')
      .leftJoin('call.user', 'user')
      .where('call.deleted = :del', { del: false })
      .andWhere('call.start_time BETWEEN :start AND :end', { start: startDate, end: endDate });

    if (role === 'center-manager') {
      // Show stats for all counselors in their center
      qb.andWhere('call.center_name = :center', { center: user?.centerName || null });
    } else if (role === 'counselor') {
      // Show only their own stats
      qb.andWhere('call.user_id = :uid', { uid: user?.id });
    }
    // super-admin sees all

    // Get detailed analytics with direction breakdown
    const detailedQb = this.callRepo.createQueryBuilder('call')
      .leftJoin('call.user', 'user')
      .leftJoin('call.lead', 'lead')
      .where('call.deleted = :del', { del: false })
      .andWhere('call.start_time BETWEEN :start AND :end', { start: startDate, end: endDate });

    if (role === 'center-manager') {
      detailedQb.andWhere('call.center_name = :center', { center: user?.centerName || null });
    } else if (role === 'counselor') {
      detailedQb.andWhere('call.user_id = :uid', { uid: user?.id });
    }

    // Get all calls for detailed analysis
    const allCalls = await detailedQb
      .select([
        'call.id AS id',
        'call.callType AS callType',
        'call.duration AS duration',
        'call.leadId AS leadId',
        'call.phoneNumber AS phoneNumber',
        'call.userId AS usrId',
        'user.firstName AS firstName',
        'user.lastName AS lastName',
        'call.centerName AS centerName',
      ])
      .getRawMany();

    // Calculate direction-based analytics
    const inboundCalls = allCalls.filter((c: any) => c.callType === 'incoming' || c.calltype === 'incoming');
    const outboundCalls = allCalls.filter((c: any) => c.callType === 'outgoing' || c.calltype === 'outgoing');
    const missedCalls = allCalls.filter((c: any) => c.callType === 'missed' || c.calltype === 'missed');

    // Answered = duration > 0, Unanswered = duration === 0 or missed
    const inboundAnswered = inboundCalls.filter((c: any) => (c.duration || 0) > 0);
    const inboundUnanswered = inboundCalls.filter((c: any) => !c.duration || c.duration === 0);
    const outboundAnswered = outboundCalls.filter((c: any) => (c.duration || 0) > 0);
    const outboundUnanswered = outboundCalls.filter((c: any) => !c.duration || c.duration === 0);

    // Unique counts by lead_id + phone_number combination
    const getUniqueCount = (calls: any[]) => {
      const uniqueSet = new Set(calls.map((c: any) => `${c.leadId || c.leadid || ''}_${c.phoneNumber || c.phonenumber || ''}`));
      return uniqueSet.size;
    };

    const directionStats = {
      // Total counts
      totalCalls: allCalls.length,
      totalInbound: inboundCalls.length,
      totalOutbound: outboundCalls.length,
      totalMissed: missedCalls.length,
      
      // Answered/Unanswered by direction
      inboundAnswered: inboundAnswered.length,
      inboundUnanswered: inboundUnanswered.length + missedCalls.length, // missed counts as unanswered inbound
      outboundAnswered: outboundAnswered.length,
      outboundUnanswered: outboundUnanswered.length,
      
      // Total answered/unanswered
      totalAnswered: inboundAnswered.length + outboundAnswered.length,
      totalUnanswered: inboundUnanswered.length + outboundUnanswered.length + missedCalls.length,
      
      // Unique counts (unique lead/phone combinations)
      uniqueInboundAnswered: getUniqueCount(inboundAnswered),
      uniqueInboundUnanswered: getUniqueCount([...inboundUnanswered, ...missedCalls]),
      uniqueOutboundAnswered: getUniqueCount(outboundAnswered),
      uniqueOutboundUnanswered: getUniqueCount(outboundUnanswered),
      uniqueAnswered: getUniqueCount([...inboundAnswered, ...outboundAnswered]),
      uniqueUnanswered: getUniqueCount([...inboundUnanswered, ...outboundUnanswered, ...missedCalls]),
      
      // Duration stats
      totalDuration: allCalls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0),
      avgDuration: allCalls.length > 0 
        ? Math.round(allCalls.reduce((sum: number, c: any) => sum + (c.duration || 0), 0) / allCalls.length)
        : 0,
    };

    // Group by user or center depending on role
    if (role === 'super-admin') {
      // Group by center
      const results = await qb
        .select('call.center_name', 'centerName')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect('SUM(call.duration)', 'totalDuration')
        .addSelect('AVG(call.duration)', 'avgDuration')
        .groupBy('call.center_name')
        .getRawMany();

      return {
        summary: directionStats,
        breakdown: results.map((r: any) => ({
          centerName: r.centerName || 'Unknown',
          totalCalls: parseInt(r.totalCalls, 10),
          totalDuration: parseInt(r.totalDuration || '0', 10),
          avgDuration: parseFloat(r.avgDuration || '0'),
        })),
      };
    } else {
      // Group by counselor (for center-manager) or self (for counselor)
      const results = await qb
        .select('call.user_id', 'userId')
        .addSelect('user.first_name', 'firstName')
        .addSelect('user.last_name', 'lastName')
        .addSelect('COUNT(*)', 'totalCalls')
        .addSelect('SUM(call.duration)', 'totalDuration')
        .addSelect('AVG(call.duration)', 'avgDuration')
        .groupBy('call.user_id')
        .addGroupBy('user.first_name')
        .addGroupBy('user.last_name')
        .getRawMany();

      return {
        summary: directionStats,
        breakdown: results.map((r: any) => ({
          userId: r.userId,
          userName: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
          totalCalls: parseInt(r.totalCalls, 10),
          totalDuration: parseInt(r.totalDuration || '0', 10),
          avgDuration: parseFloat(r.avgDuration || '0'),
        })),
      };
    }
  }

  // Batch sync from device (for offline scenarios)
  async batchSync(user: any, calls: Array<any>) {
    const results = [];
    for (const c of calls) {
      try {
        const logged = await this.logCall(user, c);
        results.push({ success: true, id: (logged as CallLog).id });
      } catch (e) {
        results.push({ success: false, error: (e as any).message });
      }
    }
    return results;
  }
}
