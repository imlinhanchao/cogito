import { Controller, Get, UseGuards, Request, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    return user;
  }

  @Get(':from/:username')
  async getUser(
    @Param('from') from: string,
    @Param('username') username: string,
  ) {
    return this.usersService.findOne(username, from);
  }
}
