import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CenterRoutingRule } from '../../database/entities/center-routing-rule.entity';
import { RoutingRulesService } from './routing-rules.service';
import { RoutingRulesController } from './routing-rules.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CenterRoutingRule])],
  providers: [RoutingRulesService],
  controllers: [RoutingRulesController],
  exports: [RoutingRulesService],
})
export class RoutingRulesModule {}
