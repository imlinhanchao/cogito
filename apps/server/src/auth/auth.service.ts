import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { IUserLite } from 'fishpi';
import * as GitHub from '../lib/github';
import { IRegisterBody } from './auth.controller';
import { User } from 'src/users/user.entity';
import { ConfigService } from 'src/config/config.service';
import path from 'path';
import fs from 'fs';

@Injectable()
export class AuthService {
  verifyTemplate = fs.readFileSync(
    path.join(__dirname, '../../assets/verify_zh.html'),
    'utf-8',
  );
  logoSvg = fs.readFileSync(
    path.join(__dirname, '../../assets/logo.svg'),
    'utf-8',
  );
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(body: IRegisterBody) {
    const user = await this.usersService.findOne(body.username, '');
    if (user) throw new Error('用户已存在');

    const emailUser = await this.usersService.findByEmail(body.email);
    if (emailUser) throw new Error('邮箱已被注册');

    return await this.usersService.save(
      new User({
        username: body.username,
        password: body.password,
        email: body.email,
        nickname: body.nickname,
        from: 'fishpi',
      }),
    );
  }

  async login(body: { username: string; password: string }) {
    const user = await this.usersService.findOne(body.username, '');
    if (!user) throw new Error('用户名或密码错误');
    const sha256 = crypto.createHash('sha256');
    const password = sha256
      .update(body.password + this.configService.get('salt'))
      .digest('hex');
    if (user.password !== password) throw new Error('用户名或密码错误');
    const isAdmin = user?.isAdmin;
    const payload = { username: user.username, sub: user.id, isAdmin };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        isAdmin,
      },
    };
  }

  async loginFishpi(user: IUserLite) {
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

  makeVerifyMail({
    user,
    token,
    domain,
  }: {
    user: User;
    token: string;
    domain: string;
  }) {
    if (!user.email) throw new Error('用户邮箱不存在');
    const verifyUrl = `${domain}/#/${user.username}/verification/?token=${token}`;
    const mail = this.verifyTemplate
      .replace('{{domain}}', domain)
      .replace('{{logo}}', this.logoSvg)
      .replace('{{nickname}}', user.username)
      .replace('{{email}}', user.email)
      .replace('{{verifyUrl}}', verifyUrl)
      .replace('{{name}}', process.env.NAME || 'Template');
    return mail;
  }
}
