import { BadRequestException, Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import * as bcrypt from 'bcryptjs';
import { Subject } from 'rxjs';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private users: Repository<User>) {}

  // Broadcast presence changes to subscribers
  private presenceSubject = new Subject<{ userId: string; presence: 'online'|'offline'|'in_meeting'|'on_call' }>();

  getPresenceEvents() {
    return this.presenceSubject.asObservable();
  }

  async createUser(
    data: { userName: string; firstName: string; lastName: string; email: string; password: string; role: 'super-admin'|'center-manager'|'counselor'; centerName?: string | null; },
    currentUser?: { id: string; role?: 'super-admin'|'center-manager'|'counselor'; centerName?: string | null }
  ): Promise<User> {
    // Basic payload validation
    if (!data?.userName || !data?.firstName || !data?.lastName || !data?.email || !data?.password) {
      throw new BadRequestException('userName, firstName, lastName, email and password are required');
    }

    // Uniqueness checks (case-insensitive for email and username)
    const existing = await this.users
      .createQueryBuilder('u')
      .where('LOWER(u.email) = LOWER(:email) OR LOWER(u.user_name) = LOWER(:userName)', {
        email: data.email,
        userName: data.userName,
      })
      .getOne();
    if (existing) {
      const emailClash = existing.email?.toLowerCase() === data.email.toLowerCase();
      const userNameClash = existing.userName?.toLowerCase() === data.userName.toLowerCase();
      const reason = emailClash && userNameClash
        ? 'Email and userName already exist'
        : emailClash
          ? 'Email already exists'
          : 'userName already exists';
      throw new ConflictException(reason);
    }

    const hash = await bcrypt.hash(data.password, 12);
    // Validate role and centerName requirements
    const role = (data.role || 'counselor') as 'super-admin'|'center-manager'|'counselor';
    let centerName: string | null = data.centerName ?? null;

    // If center-manager is creating, they can only create counselors in their own center
    const creatorRole = (currentUser?.role || 'counselor') as 'super-admin'|'center-manager'|'counselor';
    if (creatorRole === 'counselor') {
      throw new ForbiddenException('Forbidden');
    }
    if (creatorRole === 'center-manager') {
      if (role !== 'counselor') {
        throw new ForbiddenException('Center Manager can only create counselors');
      }
      centerName = currentUser?.centerName || null;
    }
    if (creatorRole === 'super-admin') {
      if (role !== 'center-manager') {
        throw new ForbiddenException('Super Admin can only create Center Managers');
      }
    }

    if (role !== 'super-admin' && (!centerName || !centerName.trim())) {
      throw new BadRequestException('centerName is required for center-manager and counselor');
    }
    if (centerName) centerName = centerName.trim();
    const user = this.users.create({
      userName: data.userName,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      userHash: hash,
      role,
      isAdmin: role === 'super-admin',
      centerName: role === 'super-admin' ? null : centerName,
    });
    try {
      return await this.users.save(user);
    } catch (err: any) {
      // Handle unique constraint violations defensively (race conditions)
      if (err?.code === '23505') {
        throw new ConflictException('Email or userName already exists');
      }
      throw err;
    }
  }

  async listUsers(
    filter?: { search?: string; role?: string; presence?: 'online'|'offline'|'in_meeting'|'on_call'; },
    currentUser?: { id: string; role?: 'super-admin'|'center-manager'|'counselor'; centerName?: string | null; isAdmin?: boolean },
    pagination?: { page?: number; limit?: number }
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const qb = this.users.createQueryBuilder('u')
      .where('u.deleted = false');

    if (filter?.role) {
      // Support comma-separated role filter for IN queries
      const roles = String(filter.role)
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      if (roles.length === 1) {
        qb.andWhere('u.role = :role', { role: roles[0] });
      } else if (roles.length > 1) {
        qb.andWhere('u.role IN (:...roles)', { roles });
      }
    }
    if (filter?.presence) {
      qb.andWhere('u.presence = :presence', { presence: filter.presence });
    }
    // designation filtering removed by requirement
    if (filter?.search) {
      const s = `%${filter.search}%`;
      qb.andWhere('(u.first_name ILIKE :s OR u.last_name ILIKE :s OR u.user_name ILIKE :s OR u.email ILIKE :s)', { s });
    }

    // Access restriction
    const effectiveRole: 'super-admin'|'center-manager'|'counselor' = (currentUser?.role || (currentUser?.isAdmin ? 'super-admin' : 'counselor')) as any;
    if (effectiveRole === 'center-manager') {
      // Center managers can see only counselors in their center
      qb.andWhere('u.role = :counselorRole', { counselorRole: 'counselor' });
      qb.andWhere('u.center_name = :centerName', { centerName: currentUser?.centerName || '' });
    } else if (effectiveRole === 'counselor') {
      // Counselors cannot list users
      throw new ForbiddenException('Forbidden');
    }

    const page = Math.max(1, Number(pagination?.page || 1));
    const limit = Math.min(200, Math.max(1, Number(pagination?.limit || 10)));

    const [rows, total] = await qb
      .orderBy('u.date_entered', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data: rows, total, page, limit };
  }

  async setPresence(userId: string, presence: 'online'|'offline'|'in_meeting'|'on_call'): Promise<{ ok: true }> {
    await this.users.update(userId, { presence } as any);
    // Emit event to listeners (SSE)
    try {
      this.presenceSubject.next({ userId, presence });
    } catch {}
    return { ok: true };
  }

  /**
   * Returns a hierarchy of Center Managers with their Counselors underneath.
   * - Super Admin: all centers and managers
   * - Center Manager: only the current manager and counselors from their center
   */
  async getHierarchy(currentUser: { id: string; role: 'super-admin'|'center-manager'|'counselor'; centerName?: string | null }) {
    const role = currentUser.role;
    if (role === 'counselor') {
      throw new ForbiddenException('Forbidden');
    }

    // Base queries
    const managerQ = this.users.createQueryBuilder('u')
      .where('u.deleted = false')
      .andWhere('u.role = :role', { role: 'center-manager' as const });
    const counselorQ = this.users.createQueryBuilder('u')
      .where('u.deleted = false')
      .andWhere('u.role = :role', { role: 'counselor' as const });

    if (role === 'center-manager') {
      // Limit to current manager and counselors in their center
      managerQ.andWhere('u.id = :id', { id: currentUser.id });
      if (currentUser.centerName) {
        counselorQ.andWhere('u.center_name = :centerName', { centerName: currentUser.centerName });
      } else {
        counselorQ.andWhere('1=0'); // no center, no counselors
      }
    }

    const [managers, counselors] = await Promise.all([managerQ.getMany(), counselorQ.getMany()]);

    // Group counselors by either reportsToId (preferred) or centerName (fallback)
    const byManagerId = new Map<string, User[]>();
    const byCenter = new Map<string, User[]>();
    for (const c of counselors) {
      if (c.reportsToId) {
        const arr = byManagerId.get(c.reportsToId) || [];
        arr.push(c);
        byManagerId.set(c.reportsToId, arr);
      }
      if (c.centerName) {
        const arr = byCenter.get(c.centerName) || [];
        arr.push(c);
        byCenter.set(c.centerName, arr);
      }
    }

    const result = managers.map((m) => {
      // Prefer counselors explicitly reporting to this manager
      let list = byManagerId.get(m.id) || [];
      // If none via reportsToId, fallback to same center
      if (list.length === 0 && m.centerName) {
        list = byCenter.get(m.centerName) || [];
      }
      // Deduplicate in case an entry appears in both maps
      const seen = new Set<string>();
      const counselorsUnique = list.filter((u) => (seen.has(u.id) ? false : (seen.add(u.id), true)));
      return {
        centerManager: {
          id: m.id,
          userName: m.userName,
          firstName: m.firstName,
          lastName: m.lastName,
          centerName: m.centerName,
          presence: m.presence,
        },
        counselors: counselorsUnique.map((u) => ({
          id: u.id,
          userName: u.userName,
          firstName: u.firstName,
          lastName: u.lastName,
          presence: u.presence,
        })),
      };
    });

    // Stable sort by center then manager name
    result.sort((a, b) => {
      const ca = (a.centerManager.centerName || '').toLowerCase();
      const cb = (b.centerManager.centerName || '').toLowerCase();
      if (ca !== cb) return ca < cb ? -1 : 1;
      const na = `${a.centerManager.firstName} ${a.centerManager.lastName}`.toLowerCase();
      const nb = `${b.centerManager.firstName} ${b.centerManager.lastName}`.toLowerCase();
      return na < nb ? -1 : na > nb ? 1 : 0;
    });

    return { data: result };
  }

  /**
   * Soft-delete a user. Super Admin only.
   * - If deleting a Center Manager: also soft-delete counselors under them
   *   (those with reportsToId = manager.id OR counselors in the same center).
   * - If deleting a Counselor: soft-delete only that counselor.
   */
  async deleteUser(userId: string, currentUser: { id: string; role: 'super-admin'|'center-manager'|'counselor' }) {
    if ((currentUser?.role || 'counselor') !== 'super-admin') {
      throw new ForbiddenException('Forbidden');
    }

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.deleted) {
      return { ok: true, deleted: 0, cascaded: 0 };
    }

    if (user.role === 'center-manager') {
      // Find counselors under this manager via reportsToId or centerName
      const qb = this.users.createQueryBuilder('u')
        .where('u.deleted = false')
        .andWhere('u.role = :role', { role: 'counselor' as const })
        .andWhere('(u.reports_to_id = :mgrId OR (u.center_name IS NOT NULL AND u.center_name = :centerName))', {
          mgrId: user.id,
          centerName: user.centerName || '',
        });
      const counselors = await qb.getMany();

      // Soft delete in a single transaction for consistency
      const runner = this.users.manager.connection.createQueryRunner();
      await runner.connect();
      await runner.startTransaction();
      try {
        if (counselors.length) {
          const ids = counselors.map((c) => c.id);
          await runner.manager
            .createQueryBuilder()
            .update(User)
            .set({ deleted: true } as any)
            .where('id IN (:...ids)', { ids })
            .execute();
        }
        await runner.manager
          .createQueryBuilder()
          .update(User)
          .set({ deleted: true } as any)
          .where('id = :id', { id: user.id })
          .execute();
        await runner.commitTransaction();
        return { ok: true, deleted: 1, cascaded: counselors.length };
      } catch (e) {
        try { await runner.rollbackTransaction(); } catch {}
        throw e;
      } finally {
        try { await runner.release(); } catch {}
      }
    }

    // Counselor or other role: just soft delete the user
    await this.users.update(user.id, { deleted: true } as any);
    return { ok: true, deleted: 1, cascaded: 0 };
  }
}
