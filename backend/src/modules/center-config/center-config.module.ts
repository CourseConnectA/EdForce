import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CenterFieldOption } from '../../database/entities/center-field-option.entity';
import { CenterConfigService } from './center-config.service';
import { CenterConfigController } from './center-config.controller';
import { User } from '../../database/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CenterFieldOption, User])],
  providers: [CenterConfigService],
  controllers: [CenterConfigController],
  exports: [CenterConfigService],
})
export class CenterConfigModule {}
