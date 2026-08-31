import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import Fishpi from 'fishpi';
import * as GitHub from '../lib/github';
import * as Steam from '../lib/steam';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async save(user: User): Promise<User> {
    const account = await this.findBySrcId(user.sourceId);
    if (account) {
      account.username = user.username;
      account.nickname = user.nickname;
      account.isAdmin = user.isAdmin;
      account.avatar = user.avatar;
      account.lastLogin = user.lastLogin;
      await this.usersRepository.update({ id: account.id }, account);
      return account;
    }
    return this.usersRepository.save(user);
  }

  async findOne(username: string, from: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { username, from } });
  }

  async findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async findBySrcId(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { sourceId: id } });
  }

  async getFishpiUser(username: string) {
    const user = await new Fishpi().user(username);
    if (!user) return null;
    return new User({
      username: user.userName,
      nickname: user.userNickname,
      isAdmin: user.role === '管理员',
      avatar: user.avatar,
      lastLogin: Date.now(),
      from: 'fishpi',
      sourceId: user.oId,
    });
  }

  async getGitHubUser(token: string) {
    const userInfo = await GitHub.getUserInfo(token);
    if (!userInfo) return null;
    return new User({
      username: userInfo.login,
      nickname: userInfo.name,
      isAdmin: false,
      avatar: userInfo.avatar_url,
      lastLogin: Date.now(),
      from: 'github',
      sourceId: userInfo.id,
    });
  }

  async getSteamUser(steamid: string) {
    const userInfo = await Steam.getUserInfo(steamid);
    if (!userInfo) return null;
    return new User({
      username:
        userInfo.profileurl.trim().split('/').slice(0, -1).pop() ||
        userInfo.personaname,
      nickname: userInfo.personaname,
      isAdmin: false,
      avatar: userInfo.avatarfull,
      lastLogin: Date.now(),
      from: 'steam',
      sourceId: userInfo.steamid,
    });
  }
}
