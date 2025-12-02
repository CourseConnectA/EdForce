import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';

@ApiTags('leads')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('leads')
export class LeadsOpenController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly jwtService: JwtService,
    @InjectRepository(User) private readonly usersRepo: Repository<User>,
  ) {}

  @Post('open-create')
  @ApiOperation({ summary: 'Create a lead (fallback endpoint)'} )
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async openCreate(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
    let user = req?.user;
    if (!user?.id) {
      try {
        const authz: string | undefined = req?.headers?.authorization || req?.headers?.Authorization;
        const token = (authz && typeof authz === 'string' && authz.startsWith('Bearer ')) ? authz.substring(7) : undefined;
        if (token) {
          const payload: any = this.jwtService.decode(token);
          const uid = payload?.sub;
          if (uid) {
            const fresh = await this.usersRepo.findOne({ where: { id: uid, deleted: false } });
            if (fresh) {
              user = {
                id: fresh.id,
                role: fresh.role,
                isAdmin: fresh.isAdmin,
                centerName: (fresh as any).centerName ?? null,
              };
            }
          }
        }
      } catch {}
    }
    return this.leadsService.create(createLeadDto, user);
  }

  @Post('integrations/ingest')
  @ApiOperation({ summary: 'Ingest a lead via API integration (forms, campaigns)' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  async ingest(@Body() createLeadDto: CreateLeadDto, @Req() req: any) {
    // Reuse the same auth path as open-create for now
    return this.openCreate(createLeadDto, req);
  }
}
