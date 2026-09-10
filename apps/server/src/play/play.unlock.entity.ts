import { Entity, PrimaryGeneratedColumn, Column, BeforeInsert } from 'typeorm';

@Entity({ name: 'play_unlock', comment: '玩家在故事中解锁的成就或结局' })
export class PlayUnlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '关联的游玩记录 ID', nullable: true })
  playId?: string;

  @Column({ comment: '故事 ID' })
  storyId: string;

  @Column({ comment: '玩家 ID，可空', nullable: true })
  userId?: string;

  @Column({ comment: '解锁类型，例如 achievement 或 ending' })
  type: string;

  @Column({ comment: '解锁名称，例如成就名称或结局名称' })
  name: string;

  @Column({ comment: '解锁描述，例如成就描述或结局描述' })
  description: string;

  @Column('json', { comment: '额外元数据', nullable: true })
  meta?: Record<string, any>;

  @Column('bigint', { comment: '解锁时间' })
  unlockedAt: number;

  @BeforeInsert()
  setUnlockTimestamp() {
    this.unlockedAt = Date.now();
  }
}
