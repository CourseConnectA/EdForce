import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as any;
    // eslint-disable-next-line no-console
    try { console.log('[RolesGuard] required=%j user=%j path=%s', requiredRoles, user ? { id: user.id, role: user.role, isAdmin: user.isAdmin } : null, request?.url); } catch {}
    // If a role is required but there is no authenticated user, deny access early
    if (!user) {
      return false;
    }
    // Normalize legacy and varied role strings to the compact model
    const rawRole = (user?.role || (user?.isAdmin ? 'super-admin' : '')) as string;
    const base = String(rawRole || '').toLowerCase().trim();
    // Replace common separators with hyphen and collapse spaces
    const canon = base
      .replace(/[_\s]+/g, '-')
      .replace(/centre/g, 'center'); // handle UK spelling

    let normalized: Role | string = canon as Role;
    if (canon === 'admin' || canon === 'superadmin' || canon.includes('super-admin')) {
      normalized = 'super-admin';
    } else if (
      canon === 'manager' ||
      canon === 'center-manager' ||
      canon.includes('manager') ||
      canon.includes('center-manager') ||
      canon.includes('centre-manager') ||
      canon === 'cm'
    ) {
      normalized = 'center-manager';
    } else if (
      canon === 'counselor' ||
      canon === 'counsellor' ||
      canon.includes('counsel') ||
      canon.includes('sales-coordinator') ||
      canon.includes('agent')
    ) {
      normalized = 'counselor';
    }
    return requiredRoles.includes(normalized as Role);
  }
}
