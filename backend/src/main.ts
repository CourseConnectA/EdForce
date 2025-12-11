import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  // trigger restart on migration addition

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // CORS configuration: allow configured origins, and by default allow localhost on any port
  const configuredOrigins = configService.get('CORS_ORIGIN')?.split(',').map(s => s.trim()).filter(Boolean) || [];
  const isProduction = configService.get('NODE_ENV') === 'production';
  
  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true; // allow non-browser or same-origin requests
    if (configuredOrigins.includes(origin)) return true;
    
    // In production, only allow explicitly configured origins
    if (isProduction) {
      return false;
    }
    
    // Development: Allow any localhost or 127.0.0.1 on any port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
    // Allow any local network IP (192.168.x.x, 10.x.x.x) for mobile testing
    if (/^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) return true;
    return false;
  };

  // app.enableCors({
  //   origin: (origin, callback) => {
  //     if (isAllowedOrigin(origin)) {
  //       callback(null, true);
  //     } else {
  //       console.log(`CORS blocked origin: ${origin}`);
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   credentials: true,
  //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Authorization', 'Content-Type', 'X-Requested-With', 'Accept', 'Origin'],
  // });

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Edforce API')
    .setDescription('Enterprise-grade Customer Relationship Management System API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Authentication', 'User authentication and authorization')
    .addTag('Accounts', 'Account management')
    .addTag('Contacts', 'Contact management')
    .addTag('Leads', 'Lead management')
    .addTag('Opportunities', 'Opportunity management')
    .addTag('Cases', 'Case management')
    .addTag('Activities', 'Task, meeting, call, and email management')
    .addTag('Campaigns', 'Marketing campaign management')
    .addTag('Products', 'Product catalog management')
    .addTag('Quotes', 'Quote management')
    .addTag('Invoices', 'Invoice management')
    .addTag('Users', 'User management')
    .addTag('Reports', 'Reporting and analytics')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get('PORT') || 3000;
  await app.listen(port, '0.0.0.0'); // Listen on all network interfaces
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📱 Mobile access: http://192.168.x.x:${port} (use your computer's IP)`);
}

bootstrap();