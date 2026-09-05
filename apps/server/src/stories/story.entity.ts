import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { StoryDto } from './stories.dto';
import { BaseStoryFields } from './base-story.entity';

@Entity({ name: 'story', comment: '故事表' })
export class Story extends BaseStoryFields {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    default: 'draft',
    comment: '状态: draft|pending|published|rejected',
  })
  status: string = 'draft';

  @Column('bigint', { comment: '创建时间' })
  createdAt: number = Date.now();

  @Column('bigint', { comment: '更新时间' })
  updatedAt: number = Date.now();

  @Column('bigint', { comment: '提交审核时间', nullable: true })
  submittedAt?: number;

  @Column('bigint', { comment: '审核通过时间', nullable: true })
  approvedAt?: number;

  @Column({ comment: '审核人ID', nullable: true })
  reviewerId?: string;

  @Column({ comment: '审核备注', nullable: true })
  reviewReason?: string;

  constructor(partial?: Partial<StoryDto>) {
    super();
    if (!partial) return;
    Object.assign(this, partial);
    this.tags = partial.tags?.join(',');
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }
}
