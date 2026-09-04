import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ comment: '用户表', name: 'user' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '用户名' })
  username: string;

  @Column({ comment: '昵称' })
  nickname: string;

  @Column({ comment: '密码', nullable: true })
  password?: string;

  @Column({ comment: '邮箱', nullable: true })
  email?: string;

  @Column({ default: false, comment: '是否为管理员' })
  isAdmin: boolean = false;

  @Column({ comment: '用户头像URL' })
  avatar: string;

  @Column('bigint', { comment: '上次登录时间' })
  lastLogin: number = 0;

  @Column({ comment: '用户来源' })
  from: string = 'fishpi';

  @Column({ comment: '第三方ID' })
  sourceId: string = '';

  @Column({ default: false, comment: '是否验证' })
  isVerified: boolean = false;

  @Column({ comment: '验证 Token', nullable: true })
  verificationToken?: string;

  static get unsafeKey() {
    return ['attr'];
  }

  constructor(user?: Partial<User>) {
    if (!user) return;
    this.username = user.username || '';
    this.nickname = user.nickname || user.username || '';
    this.password = user.password || '';
    this.email = user.email || '';
    this.isAdmin = user.isAdmin || false;
    this.avatar = user.avatar || '';
    this.lastLogin = user.lastLogin || 0;
    this.from = user.from || 'fishpi';
    this.sourceId = user.sourceId || '';
  }
}
