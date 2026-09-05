import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThanOrEqual } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { Story } from './story.entity';
import { ApprovedStory } from './approved-story.entity';
import { StoryDto } from './stories.dto';
import { omit } from 'src/utils';

type PublicStory = {
  id: string;
  title?: string;
  description?: string;
  content?: string;
  passageSize?: number;
  tags?: string[];
  authorId?: string;
  author?: any;
  createdAt?: number;
  updatedAt?: number;
  status?: string;
};

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private storiesRepo: Repository<Story>,
    @InjectRepository(ApprovedStory)
    private approvedRepo: Repository<ApprovedStory>,
    private readonly usersService: UsersService,
  ) {}

  private buildWhereForStories(
    createdAt: number,
    authorId?: string,
    search?: string,
  ): any {
    const createdCond = { createdAt: LessThanOrEqual(createdAt) };
    if (search) {
      const like = `%${search}%`;
      const clauses: any[] = [
        { title: Like(like), ...createdCond },
        { description: Like(like), ...createdCond },
        { tags: Like(like), ...createdCond },
      ];
      if (authorId) clauses.forEach((c) => (c.authorId = authorId));
      return clauses;
    }
    const where: any = { ...createdCond };
    if (authorId) where.authorId = authorId;
    return where;
  }

  private buildWhereForApproved(createdAt: number, search?: string): any {
    const createdCond = { approvedAt: LessThanOrEqual(createdAt) };
    if (search) {
      const like = `%${search}%`;
      return [
        { title: Like(like), ...createdCond },
        { description: Like(like), ...createdCond },
      ];
    }
    return { ...createdCond };
  }

  async create(dto: StoryDto): Promise<Story> {
    const story = new Story(dto);
    return this.storiesRepo.save(story);
  }

  async findAll(
    createdAt = Date.now(),
    limit = 20,
    authorId?: string,
    search?: string,
    isPublicRequest = true,
  ) {
    if (isPublicRequest) {
      const where = this.buildWhereForApproved(createdAt, search);
      const [rows, total] = await this.approvedRepo.findAndCount({
        where,
        order: { approvedAt: 'DESC' },
        take: limit,
      });

      const authorIds = rows.map((r) => r.authorId).filter(Boolean);
      const authors = await this.usersService.getUsers(authorIds);

      const data = rows.map((r) => {
        const tags = r.tags ? String(r.tags).split(',') : [];
        const mapped: PublicStory = {
          id: r.sourceStoryId,
          title: r.title,
          description: r.description,
          content: r.content,
          passageSize: r.passageSize || 0,
          tags,
          authorId: r.authorId,
          author: authors.find((a) => a.id === r.authorId) || null,
          createdAt: r.approvedAt,
          updatedAt: r.approvedAt,
          status: 'published',
        };
        return mapped;
      });

      return { data, total };
    }

    const where = this.buildWhereForStories(createdAt, authorId, search);
    const [data, total] = await this.storiesRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
    const authorIds = data.map((story) => story.authorId);
    const authors = await this.usersService.getUsers(authorIds);
    return {
      data: data.map((story) => ({
        ...story,
        tags: story.tags?.split(',') || [],
        author: authors.find((author) => author.id === story.authorId),
      })),
      total,
    };
  }

  async findOne(id: string): Promise<Story | null> {
    return this.storiesRepo.findOne({ where: { id } });
  }

  async update(
    id: string,
    dto: Partial<StoryDto>,
    authorId?: string,
  ): Promise<Story | null> {
    const story = await this.findOne(id);
    if (!story) return null;
    if (authorId && story.authorId !== authorId)
      throw new Error('这不是你的故事');
    Object.assign(story, omit(dto, ['id', 'createdAt', 'authorId']));
    if (dto.tags) story.tags = dto.tags.join(',');
    story.updatedAt = Date.now();
    await this.storiesRepo.save(story);
    return story;
  }

  async remove(id: string): Promise<boolean> {
    const res = await this.storiesRepo.delete({ id });
    return (res.affected ?? 0) > 0;
  }

  async publish(id: string, authorId?: string): Promise<Story | null> {
    const story = await this.findOne(id);
    if (!story) return null;
    if (authorId && story.authorId !== authorId)
      throw new Error('这不是你的故事');
    // author submits for review
    story.status = 'pending';
    story.submittedAt = Date.now();
    story.updatedAt = Date.now();
    await this.storiesRepo.save(story);
    return story;
  }

  /** 管理员审核并上架：创建 ApprovedStory 快照并将 story 标记为已发布 */
  async approve(id: string, adminId: string): Promise<ApprovedStory | null> {
    const story = await this.findOne(id);
    if (!story) return null;
    // mark published
    story.status = 'published';
    story.approvedAt = Date.now();
    story.reviewerId = adminId;
    story.updatedAt = Date.now();
    await this.storiesRepo.save(story);

    const approved = new ApprovedStory();
    approved.sourceStoryId = story.id;
    approved.title = story.title;
    approved.description = story.description;
    approved.content = story.content;
    approved.passageSize = story.passageSize;
    approved.tags = story.tags;
    approved.authorId = story.authorId;
    approved.approvedBy = adminId;
    approved.approvedAt = Date.now();
    // If an approved snapshot already exists for this story, replace it.
    const existing = await this.approvedRepo.findOne({
      where: { sourceStoryId: story.id },
    });
    if (existing) {
      existing.title = approved.title;
      existing.description = approved.description;
      existing.content = approved.content;
      existing.passageSize = approved.passageSize;
      existing.tags = approved.tags;
      existing.authorId = approved.authorId;
      existing.approvedBy = approved.approvedBy;
      existing.approvedAt = approved.approvedAt;
      return this.approvedRepo.save(existing);
    }

    return this.approvedRepo.save(approved);
  }

  /** 管理员拒绝投稿，保存原因并标记状态 */
  async reject(
    id: string,
    adminId: string,
    reason?: string,
  ): Promise<Story | null> {
    const story = await this.findOne(id);
    if (!story) return null;
    story.status = 'rejected';
    story.reviewReason = reason || '';
    story.reviewerId = adminId;
    story.updatedAt = Date.now();
    await this.storiesRepo.save(story);
    return story;
  }
}
