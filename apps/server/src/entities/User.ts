import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ comment: '用户表' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户名' })
  username: string;

  @Column({ comment: '昵称' })
  nickname: string;

  @Column({ default: false, comment: '是否为管理员' })
  isAdmin: boolean = false;

  @Column('bigint', { comment: '上次登录时间' })
  lastLogin: number = 0;

  @Column('json', { comment: '第三方信息' })
  attr: any = {};

  static get unsafeKey() {
    return ['attr'];
  }

  constructor(username: string = '') {
    this.username = username;
    this.nickname = username;
  }
}
