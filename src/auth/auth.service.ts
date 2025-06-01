// auth.service.ts
import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { RegisterDto, LoginDto } from './auth.dto';
import { Response } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private readonly jwtService: JwtService) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are not set');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  async register(registerDto: RegisterDto, res: Response) {
    try {
      // Check username availability
      const { data: existingUser, error: usernameError } = await this.supabase
        .from('profiles')
        .select('username')
        .eq('username', registerDto.username)
        .single();

      if (existingUser) {
        throw new ConflictException('Username already exists');
      }

      // Create auth user
      const { data: authData, error: authError } = await this.supabase.auth.signUp({
        email: registerDto.email,
        password: registerDto.password,
      });

      if (authError) {
        throw new BadRequestException(authError.message);
      }

      // Create profile
      if (!authData.user) {
        throw new InternalServerErrorException('User creation failed');
      }
      const { error: profileError } = await this.supabaseAdmin
        .from('profiles')
        .insert([{
          id: authData.user.id,
          username: registerDto.username,
          fullname: registerDto.fullname
        }]);

      if (profileError) {
        // Rollback user creation if profile creation fails
        await this.supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        throw new InternalServerErrorException('Registration failed');
      }

      // Set cookies with tokens
      this.setAuthCookies(
        res,
        authData.session?.access_token || '',
        authData.session?.refresh_token || ''
      );

      return res.status(201).json({
        message: 'Registration successful',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          username: registerDto.username
        }
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      throw new InternalServerErrorException('Registration process failed');
    }
  }

  async login(loginDto: LoginDto, res: Response) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: loginDto.email,
        password: loginDto.password,
      });

      if (error || !data.session) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // Get user profile
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('username, fullname, role')
        .eq('id', data.user.id)
        .single();

      // Set cookies with tokens
      this.setAuthCookies(
        res,
        data.session.access_token,
        data.session.refresh_token
      );

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          ...profile
        }
      });
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async logout(res: Response) {
    try {
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw new BadRequestException('Logout failed');
      }

      return res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
      throw new InternalServerErrorException('Logout process failed');
    }
  }

  async refreshToken(refreshToken: string, res: Response) {
    try {
      const { data, error } = await this.supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Set new cookies
      this.setAuthCookies(
        res,
        data.session.access_token,
        data.session.refresh_token
      );

      return res.status(200).json({ 
        message: 'Token refreshed successfully',
        user: data.user
      });
    } catch (error) {
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async validateUser(payload: any) {
    const { data: user, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', payload.sub)
      .single();

    if (error || !user) {
      throw new UnauthorizedException('Invalid user');
    }

    return user;
  }
}