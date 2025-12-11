import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

// Import entities
import { Account } from './entities/account.entity';
import { Contact } from './entities/contact.entity';
import { Lead } from './entities/lead.entity';
import { Opportunity } from './entities/opportunity.entity';
import { Case } from './entities/case.entity';
import { Task } from './entities/task.entity';
import { User } from './entities/user.entity';
import { ActivityLog } from './entities/activity-log.entity';
import { Campaign } from './entities/campaign.entity';
import { Workflow } from './entities/workflow.entity';
import { CustomFieldDefinition } from './entities/custom-field-definition.entity';
import { CustomFieldValue } from './entities/custom-field-value.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST'),
        port: configService.get('DATABASE_PORT'),
        username: configService.get('DATABASE_USERNAME'),
        password: configService.get('DATABASE_PASSWORD'),
        database: configService.get('DATABASE_NAME'),
        synchronize: configService.get('TYPEORM_SYNCHRONIZE') === 'true',
        entities: [
          Account,
          Contact,
          Lead,
          Opportunity,
          Case,
          Task,
          User,
          ActivityLog,
          Campaign,
          Workflow,
          CustomFieldDefinition,
          CustomFieldValue,
        ],
        migrations: [
          __dirname + '/migrations/*{.ts,.js}',
        ],
        // Disable auto-migrations in production - run manually with npm run migration:run
        migrationsRun: configService.get('NODE_ENV') !== 'production' && 
          configService.get('TYPEORM_SYNCHRONIZE') !== 'true' &&
          configService.get('TYPEORM_RUN_MIGRATIONS') === 'true',
        logging: configService.get('NODE_ENV') === 'development',
        autoLoadEntities: true,
        retryDelay: 3000,
        retryAttempts: 3,
      }),
      inject: [ConfigService],
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options);
        return dataSource.initialize();
      },
    }),
  ],
})
export class DatabaseModule {}