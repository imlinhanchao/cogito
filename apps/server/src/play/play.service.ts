import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Play } from './play.entity';
import { omit } from 'src/utils';
import { PlayUnlock } from './play.unlock.entity';
import { PlayStoryDto } from './play.dto';
import { StoriesService } from '../stories/stories.service';
import { User } from 'src/users/user.entity';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class PlayService {
  constructor(
    @InjectRepository(Play) private playRepo: Repository<Play>,
    @InjectRepository(PlayUnlock)
    private playUnlockRepo: Repository<PlayUnlock>,
    private readonly storiesService: StoriesService,
    private readonly usersService: UsersService,
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

  async getUserUnlocksGrouped(
    userId: string,
    includePrivate = false,
  ): Promise<PlayStoryDto[]> {
    const rows = await this.playUnlockRepo.find({ where: { userId } });
    const map = new Map<string, { points: any[]; end: any[] }>();
    for (const r of rows) {
      const entry = map.get(r.storyId) || { points: [], end: [] };
      if (r.type === 'achievement')
        entry.points.push({ name: r.name, description: r.description });
      else if (r.type === 'ending')
        entry.end.push({ name: r.name, description: r.description });
      map.set(r.storyId, entry);
    }
    const plays = await this.playRepo
      .createQueryBuilder('play')
      .select('play.storyId', 'storyId')
      .distinct(true)
      .where('play.userId = :userId', { userId })
      .getRawMany();
    for (const play of plays) {
      if (map.has(play.storyId)) continue;
      const entry = map.get(play.storyId) || { points: [], end: [] };
      map.set(play.storyId, entry);
    }
    const out: PlayStoryDto[] = [];
    const storyIds = Array.from(map.keys());
    const storys = includePrivate
      ? await this.storiesService.getStorysByIds(storyIds)
      : [];
    const approvedStories =
      await this.storiesService.getApprovedByIds(storyIds);

    // Batch fetch latest plays for these stories to determine isPlaying
    const latestPlays = storyIds.length
      ? await this.playRepo.find({
          where: { userId, storyId: In(storyIds) },
          order: { createdAt: 'DESC' },
        })
      : [];
    const latestByStory = new Map<string, Play>();
    for (const p of latestPlays) {
      if (!latestByStory.has(p.storyId)) latestByStory.set(p.storyId, p);
    }

    for (const [storyId, v] of map.entries()) {
      const story =
        storys.find((s) => s.id === storyId) ||
        approvedStories.find((s) => s.id === storyId);
      if (!story) continue;
      const latest = latestByStory.get(storyId);
      const isPlaying = !!latest && !latest.isEnding;
      out.push({
        ...story,
        storyId,
        points: v.points,
        end: v.end,
        isPlaying,
      });
    }
    return out;
  }

  async getReaders(storyId: string, userId: string): Promise<Partial<User>[]> {
    const p: { userId: string }[] = await this.playRepo
      .createQueryBuilder('play')
      .select('play.userId', 'userId')
      .distinct(true)
      .where('play.storyId = :storyId', { storyId })
      .getRawMany();
    const userIds = p.filter((p) => p.userId !== userId).map((p) => p.userId);
    const readers = await this.usersService.getUsers(userIds);
    return readers.map((r) => omit(r, User.unsafeKey));
  }
}
