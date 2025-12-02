import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
// import { CacheModule } from '@nestjs/cache-manager';
// import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
// import * as redisStore from 'cache-manager-redis-store';

// Import modules
import { AuthModule } from './modules/auth/auth.module';
import { AccountsModule } from './modules/accounts/accounts.module';
// import { ContactsModule } from './modules/contacts/contacts.module';
import { LeadsModule } from './modules/leads/leads.module';
import { OpportunitiesModule } from './modules/opportunities/opportunities.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
// import { WorkflowsModule } from './modules/workflows/workflows.module';
import { MarketingAutomationModule } from './modules/marketing-automation/marketing-automation.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { UsersModule } from './modules/users/users.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CenterConfigModule } from './modules/center-config/center-config.module';
import { RoutingRulesModule } from './modules/routing-rules/routing-rules.module';
import { ReportsModule } from './modules/reports/reports.module';
import { CallsModule } from './modules/calls/calls.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Database
    DatabaseModule,

    // Cache - disabled for now
    // CacheModule.registerAsync({
    //   imports: [ConfigModule],
    //   useFactory: async (configService: ConfigService) => ({
    //     store: redisStore,
    //     host: configService.get('REDIS_HOST'),
    //     port: configService.get('REDIS_PORT'),
    //     ttl: 600, // 10 minutes
    //   }),
    //   inject: [ConfigService],
    //   isGlobal: true,
    // }),

    // Rate limiting - disabled for now
    // ThrottlerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   useFactory: (configService: ConfigService) => ({
    //     throttlers: [
    //       {
    //         ttl: configService.get('RATE_LIMIT_WINDOW_MS') || 900000,
    //         limit: configService.get('RATE_LIMIT_MAX_REQUESTS') || 100,
    //       },
    //     ],
    //   }),
    //   inject: [ConfigService],
    // }),

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Default secret for local dev if none provided
        secret: configService.get('JWT_SECRET') || 'dev-secret-change-me',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),

    // Passport
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // Bull Queue (Redis)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            url: redisUrl,
          } as any;
        }
        return {
          redis: {
            host: config.get('REDIS_HOST') || 'localhost',
            port: parseInt(config.get('REDIS_PORT') || '6379', 10),
          },
        } as any;
      },
      inject: [ConfigService],
    }),

    // Application modules
    AuthModule,
    AccountsModule,
    // ContactsModule, // disabled
    LeadsModule,
    OpportunitiesModule,
    CampaignsModule,
    // WorkflowsModule, // replaced
    WhatsappModule,
    UsersModule,
    DashboardModule,
    MarketingAutomationModule,
    CenterConfigModule,
    RoutingRulesModule,
    ReportsModule,
    CallsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}