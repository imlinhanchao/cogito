import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Play } from './play.entity';
import { omit } from 'src/utils';
import { PlayUnlock } from './play.unlock.entity';

@Injectable()
export class PlayService {
  constructor(
    @InjectRepository(Play) private playRepo: Repository<Play>,
    @InjectRepository(PlayUnlock)
    private playUnlockRepo: Repository<PlayUnlock>,
  ) {}

  async create(payload: Partial<Play>): Promise<Play> {
    const entity = this.playRepo.create({
      ...payload,
      variables: payload.variables ?? {},
      history: payload.history ?? [],
    });
    const saved = await this.playRepo.save(entity);
    return saved;
  }

  async findLatestByStoryId(
    storyId: string,
    userId: string,
  ): Promise<Play | null> {
    const playRecord = await this.playRepo.findOne({
      where: { storyId, userId, isEnding: false },
      order: { createdAt: 'DESC' },
    });
    if (playRecord) return playRecord;
    return this.playRepo.findOne({
      where: { storyId, userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Play | null> {
    return this.playRepo.findOne({ where: { id } });
  }

  async update(id: string, patch: Partial<Play>): Promise<Play | null> {
    const existing = await this.findOne(id);
    if (!existing) return null;
    Object.assign(
      existing,
      omit(patch, ['id', 'storyId', 'userId', 'createdAt', 'updatedAt']),
    );
    await this.playRepo.update(existing.id, existing);
    return existing;
  }

  async remove(id: string): Promise<void> {
    await this.playRepo.delete(id);
  }

  async createUnlock(payload: PlayUnlock): Promise<PlayUnlock> {
    const unlock = await this.playUnlockRepo.findOne({
      where: {
        storyId: payload.storyId,
        userId: payload.userId,
        type: payload.type,
        name: payload.name,
      },
    });
    if (unlock) {
      return unlock;
    }
    const entity = this.playUnlockRepo.create(payload);
    const saved = await this.playUnlockRepo.save(entity);
    return saved;
  }
}
