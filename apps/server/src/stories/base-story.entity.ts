import { Column } from 'typeorm';

export abstract class BaseStoryFields {
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
}
