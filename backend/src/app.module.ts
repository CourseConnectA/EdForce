import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
// import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
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
// Marketing and WhatsApp modules disabled - feature coming soon
// import { MarketingAutomationModule } from './modules/marketing-automation/marketing-automation.module';
import { DatabaseModule } from './database/database.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
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

    // Rate limiting for API protection (prevents DoS and brute force)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 10,    // 10 requests per second per IP
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 50,    // 50 requests per 10 seconds per IP
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 200,   // 200 requests per minute per IP
      },
    ]),

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

    // JWT
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Default secret for local dev if none provided
        secret: configService.get('JWT_SECRET') || 'dev-secret-change-me',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '24h',
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
    // WhatsappModule, // disabled - coming soon
    UsersModule,
    DashboardModule,
    // MarketingAutomationModule, // disabled - coming soon
    CenterConfigModule,
    RoutingRulesModule,
    ReportsModule,
    CallsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}