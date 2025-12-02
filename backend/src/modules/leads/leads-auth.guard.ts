import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

// Permissive guard: best-effort populate req.user from Authorization header if missing
@Injectable()
export class LeadsAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    if (req?.user && req.user.id) return true;
    try {
      const authz: string | undefined = req?.headers?.authorization || req?.headers?.Authorization;
      const token = (authz && typeof authz === 'string' && authz.startsWith('Bearer ')) ? authz.substring(7) : undefined;
      if (!token) return true;
      const payload: any = this.jwtService.decode(token);
      const uid = payload?.sub;
      if (!uid) return true;
      const fresh = await this.usersRepo.findOne({ where: { id: uid, deleted: false } });
      if (fresh) {
        req.user = {
          id: fresh.id,
          role: fresh.role,
          isAdmin: fresh.isAdmin,
          centerName: (fresh as any).centerName ?? null,
        };
      }
    } catch {}
    return true;
  }
}
