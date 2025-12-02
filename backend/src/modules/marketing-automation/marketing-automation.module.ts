import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AutomationCampaign } from '../../database/entities/automation-campaign.entity';
import { AutomationStep } from '../../database/entities/automation-step.entity';
import { AutomationBatch } from '../../database/entities/automation-batch.entity';
import { AutomationBatchItem } from '../../database/entities/automation-batch-item.entity';
import { AutomationEvent } from '../../database/entities/automation-event.entity';
import { MarketingAutomationService } from './marketing-automation.service';
import { RolesGuard } from '../../common/roles.guard';
import { MarketingAutomationController } from './marketing-automation.controller';
import { TrackingController } from './tracking.controller';
import { BullModule } from '@nestjs/bull';
import { MarketingEmailProcessor } from './processors/marketing-email.processor';
import { Lead } from '../../database/entities/lead.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'marketing-email' }),
    TypeOrmModule.forFeature([
      AutomationCampaign,
      AutomationStep,
      AutomationBatch,
      AutomationBatchItem,
      AutomationEvent,
      Lead,
    ]),
  ],
  providers: [MarketingAutomationService, RolesGuard, MarketingEmailProcessor],
  controllers: [MarketingAutomationController, TrackingController],
  exports: [MarketingAutomationService],
})
export class MarketingAutomationModule {}
