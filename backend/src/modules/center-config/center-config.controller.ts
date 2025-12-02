import { Controller, Get, Query, UseGuards, Param, Put, Body, Req, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CenterConfigService } from './center-config.service';
import { normalizeRole } from '../../common/role.util';

@UseGuards(AuthGuard('jwt'))
@Controller()
export class CenterConfigController {
  constructor(private readonly svc: CenterConfigService) {}

  // For form UIs: fetch effective options for the current user's center
  @Get('centers/options')
  async getMyCenterOptions(@Req() req: any) {
    return this.svc.getOptionsForUserCenter(req.user);
  }

  // Admin endpoints
  @Get('admin/centers')
  async listCenters(@Query('q') q?: string, @Req() req?: any) {
    const role = normalizeRole(req?.user?.role, req?.user?.isAdmin);
    if (role !== 'super-admin') throw new ForbiddenException('Only super admin');
    return this.svc.listCenters(q);
  }

  @Get('admin/centers/:center/options')
  async getCenterOptions(@Param('center') center: string, @Req() req: any) {
    const role = normalizeRole(req?.user?.role, req?.user?.isAdmin);
    if (role !== 'super-admin') throw new ForbiddenException('Only super admin');
    return this.svc.getEffectiveOptionsForCenter(center);
  }

  @Put('admin/centers/:center/options/:fieldKey')
  async updateCenterFieldOptions(
    @Param('center') center: string,
    @Param('fieldKey') fieldKey: string,
    @Body() body: { options?: string[] },
    @Req() req: any,
  ) {
    const role = normalizeRole(req?.user?.role, req?.user?.isAdmin);
    if (role !== 'super-admin') throw new ForbiddenException('Only super admin');
    const options = Array.isArray(body?.options) ? body.options : [];
    return this.svc.upsertOptions(center, fieldKey, options);
  }
}
