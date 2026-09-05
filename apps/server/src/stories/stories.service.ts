import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, LessThanOrEqual } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { Story } from './story.entity';
import { StoryDto } from './stories.dto';
import { omit } from 'src/utils';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private storiesRepo: Repository<Story>,
    private readonly usersService: UsersService,
  ) {}

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
  ): Promise<{ data: Story[]; total: number }> {
    // Build ORM-style where conditions. When `search` is provided,
    // create an OR-array across `title`, `description`, `tags`.
    let where: any;
    const createdCond = { createdAt: LessThanOrEqual(createdAt) };

    if (search) {
      const like = `%${search}%`;
      const clauses: any[] = [
        { title: Like(like), ...createdCond },
        { description: Like(like), ...createdCond },
        { tags: Like(like), ...createdCond },
      ];
      if (authorId) {
        clauses.forEach((c) => (c.authorId = authorId));
      } else if (isPublicRequest) {
        clauses.forEach((c) => (c.isPublished = true));
      }
      where = clauses;
    } else {
      where = { ...createdCond };
      if (authorId) where.authorId = authorId;
      else if (isPublicRequest) where.isPublished = true;
    }

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
}
