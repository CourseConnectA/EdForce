import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CenterRoutingRule } from '../../database/entities/center-routing-rule.entity';
import { normalizeRole } from '../../common/role.util';

@Injectable()
export class RoutingRulesService {
  constructor(
    @InjectRepository(CenterRoutingRule) private rulesRepo: Repository<CenterRoutingRule>,
  ) {}

  async getActiveForCenter(centerName: string | null) {
    if (!centerName) return null;
    const now = new Date();
    const rule = await this.rulesRepo.createQueryBuilder('r')
      .where('r.center_name = :center', { center: centerName })
      .andWhere('r.is_active = :ia', { ia: true })
      .orderBy('r.date_modified', 'DESC')
      .getOne();
    if (!rule) return null;
    if (rule.activeUntil && rule.activeUntil < now) {
      // expire lazily
      rule.isActive = false;
      await this.rulesRepo.save(rule);
      return null;
    }
    return rule;
  }

  async getActive(user: any) {
    const centerName = user?.centerName || null;
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role !== 'center-manager' && role !== 'super-admin') {
      throw new ForbiddenException('Not allowed');
    }
    return this.getActiveForCenter(centerName);
  }

  async start(user: any, payload: { ruleType: 'round_robin'|'skill_match'; activeUntil: string; config?: any }) {
    const centerName = user?.centerName || null;
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role !== 'center-manager') throw new ForbiddenException('Only center manager can start rules');
    const activeUntil = payload?.activeUntil ? new Date(payload.activeUntil) : null;
    if (!activeUntil || isNaN(activeUntil.getTime())) throw new BadRequestException('activeUntil is required');
    const toSave = this.rulesRepo.create({
      centerName,
      ruleType: payload.ruleType,
      config: payload?.config || {},
      activeUntil,
      isActive: true,
      lastAssignedUserId: null,
    } as any);
    // Disable existing active rules for this center
    await this.rulesRepo.createQueryBuilder()
      .update(CenterRoutingRule)
      .set({ isActive: false } as any)
      .where('center_name = :center AND is_active = :ia', { center: centerName, ia: true })
      .execute();
    return this.rulesRepo.save(toSave);
  }

  async stop(user: any) {
    const centerName = user?.centerName || null;
    const role = normalizeRole(user?.role, user?.isAdmin);
    if (role !== 'center-manager') throw new ForbiddenException('Only center manager can stop rules');
    const active = await this.getActiveForCenter(centerName);
    if (!active) return { stopped: false };
    active.isActive = false;
    await this.rulesRepo.save(active);
    return { stopped: true };
  }

  async updateLastAssigned(centerName: string | null, userId: string | null) {
    if (!centerName) return;
    const rule = await this.getActiveForCenter(centerName);
    if (!rule) return;
    rule.lastAssignedUserId = userId || null;
    await this.rulesRepo.save(rule);
  }
}
