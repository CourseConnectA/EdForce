import { Body, Controller, Get, Post, UseGuards, Request, Query, Patch, Param, ForbiddenException, Sse, Delete } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/roles.decorator';
import { RolesGuard } from '../../common/roles.guard';
import { UsersService } from './users.service';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Get()
  findAll(
    @Request() req,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('presence') presence?: 'online'|'offline'|'in_meeting'|'on_call',
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const effectiveRole = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    if (!['super-admin','center-manager'].includes(effectiveRole)) {
      throw new ForbiddenException('Forbidden');
    }
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.service.listUsers(
      { search, role, presence },
      { id: req.user?.id, role: effectiveRole, centerName: req.user?.centerName, isAdmin: req.user?.isAdmin },
      { page: isNaN(pageNum) ? 1 : pageNum, limit: isNaN(limitNum) ? 10 : limitNum }
    );
  }

  @Post()
  // Permission is enforced in service based on current user role (super-admin/center-manager)
  create(@Request() req, @Body() body: any) {
    return this.service.createUser(body, { id: req.user?.id, role: (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as any, centerName: req.user?.centerName });
  }

  // Allow non-admin users to update their own presence; block admins
  @Patch('me/presence')
  updateMyPresence(@Request() req, @Body() body: { presence: 'online'|'offline'|'in_meeting'|'on_call' }) {
    const userId = req.user?.id;
    if (!userId) throw new ForbiddenException('Unauthorized');
    const role = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    if (role === 'super-admin') {
      throw new ForbiddenException('Admins cannot update presence');
    }
    return this.service.setPresence(userId, body.presence);
  }

  // Admins can update presence for any user (optional)
  @Patch(':id/presence')
  @Roles('super-admin')
  updatePresence(@Param('id') id: string, @Body() body: { presence: 'online'|'offline'|'in_meeting'|'on_call' }) {
    return this.service.setPresence(id, body.presence);
  }

  // Server-Sent Events stream for presence updates (authenticated)
  @Sse('events')
  events(@Request() req): Observable<MessageEvent> {
    // Guarded by AuthGuard('jwt'); token may come from Authorization header or access_token query
    return this.service.getPresenceEvents().pipe(
      map((data) => ({ data }) as MessageEvent)
    );
  }

  // Hierarchy for Presence view
  @Get('hierarchy')
  findHierarchy(@Request() req) {
    const effectiveRole = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    if (!['super-admin','center-manager'].includes(effectiveRole)) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.getHierarchy({ id: req.user?.id, role: effectiveRole, centerName: req.user?.centerName });
  }

  // Super Admin delete user (with cascade for center manager)
  @Delete(':id')
  @Roles('super-admin')
  removeUser(@Param('id') id: string, @Request() req) {
    const role = (req.user?.role || (req.user?.isAdmin ? 'super-admin' : 'counselor')) as 'super-admin'|'center-manager'|'counselor';
    return this.service.deleteUser(id, { id: req.user?.id, role });
  }
}
