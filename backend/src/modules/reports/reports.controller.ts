import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';

@UseGuards(AuthGuard('jwt'))
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  // Folders
  @Get('folders') listFolders(@Req() req: any) { return this.svc.listFolders(req.user); }
  @Post('folders') createFolder(@Req() req: any, @Body() body: { name: string; description?: string }) { return this.svc.createFolder(req.user, body); }
  @Patch('folders/:id') updateFolder(@Req() req: any, @Param('id') id: string, @Body() body: { name?: string; description?: string }) { return this.svc.updateFolder(req.user, id, body); }
  @Delete('folders/:id') deleteFolder(@Req() req: any, @Param('id') id: string) { return this.svc.deleteFolder(req.user, id); }

  // Fields by type
  @Get('fields') getFields(@Query('type') type?: string) { return this.svc.getFieldsByType(type || 'leads'); }

  // Reports
  @Get() list(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('createdByMe') createdByMe?: string,
    @Query('sharedWithMe') sharedWithMe?: string,
    @Query('all') all?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC'|'DESC',
  ) {
    return this.svc.listReports(
      req.user,
      { search, category, createdByMe: createdByMe === 'true', sharedWithMe: sharedWithMe === 'true', all: all === 'true' } as any,
      { page: parseInt(page || '1', 10), limit: parseInt(limit || '25', 10), sortBy, sortOrder }
    );
  }

  @Post() create(@Req() req: any, @Body() body: any) { return this.svc.createReport(req.user, body); }
  @Get(':id') getOne(@Req() req: any, @Param('id') id: string) { return this.svc.getReport(req.user, id); }
  @Patch(':id') update(@Req() req: any, @Param('id') id: string, @Body() body: any) { return this.svc.updateReport(req.user, id, body); }
  @Delete(':id') remove(@Req() req: any, @Param('id') id: string) { return this.svc.deleteReport(req.user, id); }
  @Patch(':id/star') star(@Req() req: any, @Param('id') id: string, @Body() body: { starred: boolean }) { return this.svc.starReport(req.user, id, !!body?.starred); }

  // Runner and charts
  @Post('run') run(@Req() req: any, @Body() body: { reportType: string; config: any; preview?: boolean }) { return this.svc.runReport(req.user, body); }
  @Post('charts') charts(@Req() req: any, @Body() body: any) { return this.svc.generateChart(req.user, body); }

  @Patch(':id/share') share(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { target: 'center' | 'user'; userId?: string; unshare?: boolean }
  ) {
    return this.svc.shareReport(req.user, id, body);
  }
}
