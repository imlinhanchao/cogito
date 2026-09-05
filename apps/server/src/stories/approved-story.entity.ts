import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { BaseStoryFields } from './base-story.entity';

@Entity({ name: 'approved_story', comment: '已审核并上架的故事' })
export class ApprovedStory extends BaseStoryFields {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '原始故事ID' })
  sourceStoryId: string;

  @Column({ comment: '审核人ID' })
  approvedBy: string;

  @Column('bigint', { comment: '审核时间' })
  approvedAt: number = Date.now();
}
