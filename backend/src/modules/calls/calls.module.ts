import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CallLog } from '../../database/entities/call-log.entity';
import { Lead } from '../../database/entities/lead.entity';
import { User } from '../../database/entities/user.entity';
import { CallsService } from './calls.service';
import { CallsController } from './calls.controller';
import { DataSyncGateway } from '../../gateways/data-sync.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([CallLog, Lead, User])],
  controllers: [CallsController],
  providers: [CallsService, DataSyncGateway],
  exports: [CallsService],
})
export class CallsModule {}
