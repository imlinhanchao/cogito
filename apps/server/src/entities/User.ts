import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ comment: '用户表' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '用户名' })
  username: string;

  @Column({ comment: '昵称' })
  nickname: string;

  @Column({ default: false, comment: '是否为管理员' })
  isAdmin: boolean = false;

  @Column({ comment: '用户头像URL' })
  avatar: string;

  @Column('bigint', { comment: '上次登录时间' })
  lastLogin: number = 0;

  @Column({ comment: '用户来源' })
  from: string = 'fishpi';

  @Column({ comment: '第三方ID' })
  sourceId: string;

  static get unsafeKey() {
    return ['attr'];
  }

  constructor(user?: Partial<User>) {
    if (!user) return;
    this.username = user.username || '';
    this.nickname = user.nickname || '';
    this.isAdmin = user.isAdmin || false;
    this.avatar = user.avatar || '';
    this.lastLogin = user.lastLogin || 0;
    this.from = user.from || 'fishpi';
    this.sourceId = user.sourceId || '';
  }
}
