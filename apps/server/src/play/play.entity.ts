import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

export interface IHistory {
  /**
   * 上一段落名
   */
  from: string;
  /**
   * 下一段落名
   */
  to: string;
  /**
   * 玩家执行的动作
   */
  action: string;
  /**
   * 动作发生的时间戳
   */
  at: number;
}

@Entity({ name: 'story_play', comment: '玩家游玩会话/进度' })
export class Play {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '故事 ID' })
  storyId: string;

  @Column({ comment: '玩家 ID，可空', nullable: true })
  userId?: string;

  @Column({ comment: '当前段落名' })
  currentPassage: string;

  @Column('text', { comment: '当前段落的 HTML 内容' })
  html: string;

  @Column('json', { comment: '序列化的变量 JSON' })
  variables: Record<string, any>;

  @Column('text', { comment: '加密的 runtime dataset', nullable: true })
  dataset?: string;

  @Column('json', { comment: '段落历史（JSON 数组）' })
  history: IHistory[] = [];

  @Column('bigint', { comment: '创建时间' })
  createdAt: number;

  @Column('bigint', { comment: '更新时间' })
  updatedAt: number;

  @BeforeInsert()
  setCreateTimestamp() {
    const now = Date.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @BeforeUpdate()
  setUpdateTimestamp() {
    this.updatedAt = Date.now();
  }
}
