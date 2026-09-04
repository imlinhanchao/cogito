import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Story } from './story.entity';
import { StoryDto } from './stories.dto';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(Story)
    private storiesRepo: Repository<Story>,
  ) {}

  async create(dto: StoryDto): Promise<Story> {
    const story = new Story(dto);
    return this.storiesRepo.save(story);
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: Story[]; total: number }> {
    const [data, total] = await this.storiesRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }

  async findOne(id: string): Promise<Story | null> {
    return this.storiesRepo.findOne({ where: { id } });
  }

  async update(id: string, dto: Partial<StoryDto>): Promise<Story | null> {
    const story = await this.findOne(id);
    if (!story) return null;
    Object.assign(story, dto);
    story.tags = dto.tags?.join(',');
    story.updatedAt = Date.now();
    await this.storiesRepo.update({ id }, story);
    return story;
  }

  async remove(id: string): Promise<boolean> {
    const res = await this.storiesRepo.delete({ id });
    return (res.affected ?? 0) > 0;
  }
}
