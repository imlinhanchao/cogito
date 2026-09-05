import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { StoryDto } from './stories.dto';

@Entity({ name: 'story', comment: '故事表' })
export class Story {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ comment: '标题' })
  title: string;

  @Column({ comment: '简介', nullable: true })
  description?: string;

  @Column('text', { comment: '内容' })
  content: string;

  @Column({ comment: '文章段落数', nullable: true })
  passageSize: number;

  @Column({ comment: '作者ID', nullable: true })
  authorId: string;

  @Column({ comment: '标签', nullable: true })
  tags?: string;

  @Column({ default: false, comment: '已发布' })
  isPublished: boolean = false;

  @Column('bigint', { comment: '创建时间' })
  createdAt: number = Date.now();

  @Column('bigint', { comment: '更新时间' })
  updatedAt: number = Date.now();

  constructor(partial?: Partial<StoryDto>) {
    if (!partial) return;
    Object.assign(this, partial);
    this.tags = partial.tags?.join(',');
    this.createdAt = Date.now();
    this.updatedAt = Date.now();
  }
}
