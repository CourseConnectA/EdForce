import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): object {
    return {
      message: 'Welcome to the Edforce API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      documentation: '/api/docs'
    };
  }

  getHealth(): object {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage()
    };
  }
}