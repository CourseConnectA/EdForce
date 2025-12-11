import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Application')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get application info' })
  @ApiResponse({ status: 200, description: 'Application information' })
  getRoot(): object {
    return {
      message: 'Edforce API Server',
      version: '1.0.0',
      documentation: '/api/docs',
      api: '/api'
    };
  }

  @Get('info')
  @ApiOperation({ summary: 'Get API info' })
  @ApiResponse({ status: 200, description: 'API information' })
  getHello(): object {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Application health status' })
  getHealth(): object {
    return this.appService.getHealth();
  }
}