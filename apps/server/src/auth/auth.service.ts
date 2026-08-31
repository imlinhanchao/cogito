import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { IUserLite } from 'fishpi';
import * as GitHub from '../lib/github';
import type { Request as ExpressRequest } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async login(user: IUserLite) {
    const userDetail = await this.usersService.getFishpiUser(user.userName);
    if (!userDetail) throw new Error('用户不存在');
    await this.usersService.save(userDetail);
    const isAdmin = userDetail?.isAdmin;
    const payload = { username: user.userName, sub: user.oId, isAdmin };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.oId,
        username: user.userName,
        isAdmin,
      },
    };
  }

  async loginGithub(query: any, domain: string) {
    const accessToken = await GitHub.verify(query, domain);
    if (accessToken) {
      const userInfo = await this.usersService.getGitHubUser(accessToken);
      if (!userInfo) throw new Error('获取 GitHub 用户信息失败');
      await this.usersService.save(userInfo);
      const isAdmin = userInfo?.isAdmin;
      const payload = {
        username: userInfo.username,
        sub: userInfo.sourceId,
        isAdmin,
      };
      return {
        access_token: this.jwtService.sign(payload),
        user: {
          id: userInfo.sourceId,
          username: userInfo.username,
          isAdmin,
        },
      };
    } else {
      throw new Error('GitHub OAuth 验证失败');
    }
  }

  async loginSteam(steamid: string) {
    const userInfo = await this.usersService.getSteamUser(steamid);
    if (!userInfo) throw new Error('获取 Steam 用户信息失败');
    await this.usersService.save(userInfo);
    const isAdmin = userInfo?.isAdmin;
    const payload = {
      username: userInfo.username,
      sub: userInfo.sourceId,
      isAdmin,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: userInfo.sourceId,
        username: userInfo.username,
        isAdmin,
      },
    };
  }
}
