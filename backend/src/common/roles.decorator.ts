import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
// Consolidated role model
export type Role = 'super-admin' | 'center-manager' | 'counselor';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
