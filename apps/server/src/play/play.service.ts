import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Play } from './play.entity';
import { omit } from 'src/utils';

@Injectable()
export class PlayService {
  constructor(@InjectRepository(Play) private repo: Repository<Play>) {}

  async create(payload: Partial<Play>): Promise<Play> {
    const entity = this.repo.create({
      ...payload,
      variables: payload.variables ?? {},
      history: payload.history ?? [],
    });
    const saved = await this.repo.save(entity);
    return saved;
  }

  async findLatestByStoryId(
    storyId: string,
    userId: string,
  ): Promise<Play | null> {
    return this.repo.findOne({
      where: { storyId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Play | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, patch: Partial<Play>): Promise<Play | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;
    Object.assign(
      existing,
      omit(patch, ['id', 'storyId', 'userId', 'createdAt', 'updatedAt']),
    );
    return this.repo.save(existing);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
