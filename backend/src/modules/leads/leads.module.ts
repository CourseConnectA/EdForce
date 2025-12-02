import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeadsService } from './leads.service';
import { LeadsController } from './leads.controller';
import { LeadsOpenController } from './leads.open.controller';
import { Lead } from '../../database/entities/lead.entity';
import { LeadHistory } from '../../database/entities/lead-history.entity';
import { LeadView } from '../../database/entities/lead-view.entity';
import { User } from '../../database/entities/user.entity';
import { LeadFieldSetting } from '../../database/entities/lead-field-setting.entity';
import { JwtModule } from '@nestjs/jwt';
import { LeadsAuthGuard } from './leads-auth.guard';
import { CenterRoutingRule } from '../../database/entities/center-routing-rule.entity';
import { DataSyncGateway } from '../../gateways/data-sync.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([Lead, LeadHistory, LeadView, User, LeadFieldSetting, CenterRoutingRule]), JwtModule.register({})],
  controllers: [LeadsController, LeadsOpenController],
  providers: [LeadsService, LeadsAuthGuard, DataSyncGateway],
  exports: [LeadsService],
})
export class LeadsModule {}
