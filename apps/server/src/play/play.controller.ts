import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { PlayService } from './play.service';
import { UpdatePlayDto } from './play.dto';
import { StoriesService } from '../stories/stories.service';
import { StoryRuntimeService } from '../stories/story-runtime.service';

@Controller('play')
export class PlayController {
  constructor(
    private readonly playService: PlayService,
    private readonly storiesService: StoriesService,
    private readonly storyRuntimeService: StoryRuntimeService,
  ) {}

  @Get('story/:id')
  @UseGuards(JwtAuthGuard)
  async getApprovedStory(@Param('id') id: string, @Request() req) {
    const p = await this.storiesService.findApprovedOne(id);
    if (!p) {
      throw new Error('故事不存在');
    }
    return p;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id')
  async createPlay(@Param('id') id: string, @Request() req) {
    const userId = req.user?.userId;
    const story = await this.storiesService.findOne(id);
    if (!story) throw new Error('故事不存在');

    const runtime = this.storyRuntimeService.start(story.id, story.content);
    const payload = {
      storyId: id,
      userId: userId,
      currentPassage: runtime.passage,
      variables: runtime.variables || {},
      history: [
        {
          from: '',
          to: runtime.passage,
          action: 'start',
          at: Date.now(),
        },
      ],
      dataset: runtime.dataset,
      html: runtime.html,
    };
    const created = await this.playService.create(payload);
    return { html: created.html, history: [] };
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getPlay(@Param('id') id: string, @Request() req) {
    const p = await this.playService.findLatestByStoryId(id, req.user?.userId);
    if (!p || p.storyId !== id) return null;
    return {
      ...p,
      variables: p.variables || {},
      history: p.history || [],
    };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async updatePlay(
    @Param('id') id: string,
    @Body() dto: UpdatePlayDto,
    @Request() req,
  ) {
    const p = await this.playService.findLatestByStoryId(id, req.user?.userId);
    if (!p || p.storyId !== id) return null;
    if (p.userId && p.userId !== req.user.userId)
      throw new Error('无权修改该游玩记录');

    // If runtime action provided, execute via runtime service
    if (dto.target || dto.action || dto.display) {
      const runtimeRes = this.storyRuntimeService.execute(
        p.dataset ?? '',
        dto.target,
        dto.action,
        dto.display,
      );
      const prevHistory = p.history || [];
      let decodedAction: string | undefined = undefined;
      let decodedTarget: string | undefined = undefined;
      let decodedDisplay: string | undefined = undefined;
      try {
        if (dto.action)
          decodedAction = this.storyRuntimeService.decodeInteraction(
            dto.action,
          );
      } catch {
        decodedAction = dto.action;
      }
      try {
        if (dto.target)
          decodedTarget = this.storyRuntimeService.decodeInteraction(
            dto.target,
          );
      } catch {
        decodedTarget = dto.target;
      }
      try {
        if (dto.display)
          decodedDisplay = this.storyRuntimeService.decodeInteraction(
            dto.display,
          );
      } catch {
        decodedDisplay = dto.display;
      }

      const entry = {
        from: p.currentPassage,
        to: runtimeRes.passage,
        action:
          decodedAction ??
          (decodedDisplay
            ? `display:${decodedDisplay}`
            : `goto:${decodedTarget}`),
        at: Date.now(),
      };
      const newHistory = [...prevHistory, entry];
      const updated = await this.playService.update(p.id, {
        currentPassage: runtimeRes.passage,
        variables: runtimeRes.variables as any,
        history: newHistory,
        dataset: runtimeRes.dataset,
        html: runtimeRes.html,
      });
      if (!updated) return null;

      // 检查 render-specials（成就/结局），若有则记录为解锁
      try {
        const specials = (runtimeRes as any).specials;
        if (specials) {
          // achievements / points
          if (Array.isArray(specials.points)) {
            for (const pt of specials.points) {
              try {
                await this.playService.createUnlock({
                  playId: updated.id,
                  storyId: id,
                  userId: p.userId,
                  type: 'achievement',
                  name: String(pt.name || ''),
                  description: String(pt.description || ''),
                  meta: { passage: runtimeRes.passage },
                } as any);
              } catch {
                // ignore individual unlock errors
              }
            }
          }
          // ending
          if (specials.ending) {
            try {
              await this.playService.createUnlock({
                playId: updated.id,
                storyId: id,
                userId: p.userId,
                type: 'ending',
                name: String(specials.ending.name || ''),
                description: String(specials.ending.description || ''),
                meta: { passage: runtimeRes.passage },
              } as any);
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore specials handling errors to avoid failing the update
      }

      return {
        ...updated,
        variables: updated.variables || {},
        history: updated.history || [],
        html: runtimeRes.html,
      };
    }
    throw new Error('缺少交互目标或动作');
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePlay(@Param('id') id: string, @Request() req) {
    const p = await this.playService.findLatestByStoryId(id, req.user?.userId);
    if (!p || p.storyId !== id) return null;
    if (p.userId && p.userId !== req.user.userId)
      throw new Error('无权删除该游玩记录');
    await this.playService.remove(p.id);
    return { ok: true };
  }
}
