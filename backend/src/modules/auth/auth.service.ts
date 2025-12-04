import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../../database/entities/user.entity';
import { LoginDto, AuthResponseDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: [
        { userName: username, deleted: false },
        { email: username, deleted: false },
      ],
    });

    if (user) {
      const isPasswordValid = await bcrypt.compare(password, user.userHash);
      if (isPasswordValid) {
        const { userHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.validateUser(loginDto.username, loginDto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { 
      sub: user.id, 
      username: user.userName,
      email: user.email,
      isAdmin: user.isAdmin,
      // Force super-admin role when isAdmin is true, regardless of stored textual role
      role: user.isAdmin ? 'super-admin' : ((user.role as any) || 'counselor'),
      centerName: (user as any).centerName ?? null,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Update user's last login and store refresh token
    await this.userRepository.update(user.id, {
      lastLogin: new Date(),
      refreshToken: refreshToken,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        userName: user.userName,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAdmin: user.isAdmin,
        role: (user.role as any) || (user.isAdmin ? 'super-admin' : 'counselor'),
        centerName: (user as any).centerName ?? null,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub, refreshToken, deleted: false },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload = {
        sub: user.id,
        username: user.userName,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.isAdmin ? 'super-admin' : ((user.role as any) || 'counselor'),
        centerName: (user as any).centerName ?? null,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '24h',
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      refreshToken: null,
    });
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async createDefaultAdmin(): Promise<User> {
    // Check if admin user already exists
    const existingAdmin = await this.userRepository.findOne({
      where: { userName: 'admin' },
    });

    if (existingAdmin) {
      return existingAdmin;
    }

    // Create default admin user
    const hashedPassword = await this.hashPassword('password123');
    const adminUser = this.userRepository.create({
      userName: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@edforce.com',
      userHash: hashedPassword,
      isAdmin: true,
      title: 'System Administrator',
      department: 'IT',
    });

    return this.userRepository.save(adminUser);
  }
}