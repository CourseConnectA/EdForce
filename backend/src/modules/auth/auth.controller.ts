import { Controller, Post, Body, UseGuards, Request, Get, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, AuthResponseDto } from './dto/auth.dto';
import { Response, Request as ExpressRequest } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<AuthResponseDto> {
    const result = await this.authService.login(loginDto);
    // Set httpOnly refresh token cookie for 7 days
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const cookieOptions = {
      httpOnly: true,
      secure: false, // set true when using HTTPS
      sameSite: 'lax',
      maxAge: sevenDaysMs,
      path: '/',
    } as const;
    // Primary cookie name used by backend and frontend
    res.cookie('refresh_token', result.refreshToken, cookieOptions);
    // Backward-compatibility: also set legacy cookie name if clients still look for it
    res.cookie('auth-token', result.refreshToken, cookieOptions);
    return result;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid refresh token',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response): Promise<{ accessToken: string }> {
    const tokenFromBody = refreshTokenDto?.refreshToken;
    const cookies = (req as any).cookies || {};
    const tokenFromCookie = cookies.refresh_token || cookies['auth-token'];
      const token = tokenFromBody || tokenFromCookie;
      const result = await this.authService.refreshToken(token);

      // Sliding expiration: refresh the cookie maxAge if we have a cookie token
      if (tokenFromCookie) {
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        const cookieOptions = {
          httpOnly: true,
          secure: false, // set true when using HTTPS
          sameSite: 'lax',
          maxAge: sevenDaysMs,
          path: '/',
        } as const;
        res.cookie('refresh_token', tokenFromCookie, cookieOptions);
        res.cookie('auth-token', tokenFromCookie, cookieOptions);
      }

      return result;
  }

  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({
    status: 200,
    description: 'Logout successful',
  })
  async logout(@Request() req, @Res({ passthrough: true }) res: Response): Promise<{ message: string }> {
    // Clear server-side refresh token if we have an authenticated user; otherwise just clear cookie
    if (req.user?.id) {
      await this.authService.logout(req.user.id);
    }
    res.clearCookie('refresh_token', { path: '/' });
    res.clearCookie('auth-token', { path: '/' });
    return { message: 'Logout successful' };
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
  })
  getProfile(@Request() req) {
    return req.user;
  }

  @Post('create-admin')
  @ApiOperation({ summary: 'Create default admin user (development only)' })
  @ApiResponse({
    status: 201,
    description: 'Admin user created successfully',
  })
  async createAdmin() {
    const admin = await this.authService.createDefaultAdmin();
    return {
      message: 'Admin user created successfully',
      username: admin.userName,
      defaultPassword: 'password123',
    };
  }
}