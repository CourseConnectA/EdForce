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
    leadId: string;
    phoneNumber: string;
    callType: 'outgoing' | 'incoming' | 'missed';
    startTime: Date | string;
    endTime?: Date | string;
    duration?: number;
    deviceCallLogId?: string;
    disposition?: string;
    notes?: string;
  }) {
    // Check if lead exists and user has access
    const lead = await this.leadRepo.findOne({ where: { id: dto.leadId, deleted: false } as any });
    if (!lead) throw new BadRequestException('Lead not found');

    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role === 'counselor' && lead.assignedUserId !== user?.id) {
      throw new ForbiddenException('No permission to log call for this lead');
    }
    if (role === 'center-manager') {
      // Verify lead belongs to center
      const leadOwner = lead.assignedUserId ? await this.userRepo.findOne({ where: { id: lead.assignedUserId } as any }) : null;
      const leadCenter = leadOwner?.centerName || null;
      if (leadCenter !== (user?.centerName || null)) {
        throw new ForbiddenException('No permission to log call for this lead');
      }
    }

    // Check for duplicate by deviceCallLogId
    if (dto.deviceCallLogId) {
      const existing = await this.callRepo.findOne({ where: { deviceCallLogId: dto.deviceCallLogId } as any });
      if (existing) return existing; // Already logged
    }

    const callLog = this.callRepo.create({
      leadId: dto.leadId,
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
      this.dataSyncGateway.emitCallLogged(payload);
    } catch (wsError) {
      console.error('Failed to emit call:logged event:', wsError);
    }
    
    return payload;
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
      this.dataSyncGateway.emitCallLogged(payload);
    } catch (wsError) {
      console.error('Failed to emit call:logged event after update:', wsError);
    }

    return payload;
  }

  // Get analytics: daily/monthly call stats
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

      return results.map((r: any) => ({
        centerName: r.centerName || 'Unknown',
        totalCalls: parseInt(r.totalCalls, 10),
        totalDuration: parseInt(r.totalDuration || '0', 10),
        avgDuration: parseFloat(r.avgDuration || '0'),
      }));
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

      return results.map((r: any) => ({
        userId: r.userId,
        userName: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Unknown',
        totalCalls: parseInt(r.totalCalls, 10),
        totalDuration: parseInt(r.totalDuration || '0', 10),
        avgDuration: parseFloat(r.avgDuration || '0'),
      }));
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
