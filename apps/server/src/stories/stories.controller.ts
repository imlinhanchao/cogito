import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalAuthGuard } from '../auth/optional-auth.guard';
import { StoriesService } from './stories.service';
import { StoryDto } from './stories.dto';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @UseGuards(OptionalAuthGuard)
  @Get()
  async list(
    @Request() req,
    @Query('createdAt') createdAt?: number,
    @Query('limit') limit?: number,
    @Query('authorId') authorId?: string,
    @Query('search') search?: string,
  ) {
    const c = createdAt || Date.now();
    const l = limit || 20;
    // 如果接口没有传 authorId 且请求中包含已认证的用户，则将其作为 authorId
    const isPublicRequest = authorId !== req?.user?.userId;
    return this.storiesService.findAll(c, l, authorId, search, isPublicRequest);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.storiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: StoryDto, @Request() req) {
    dto.authorId = req.user.userId;
    return this.storiesService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<StoryDto>,
    @Request() req,
  ) {
    return this.storiesService.update(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const story = await this.storiesService.findOne(id);
    if (!story || story.authorId !== req.user.userId) {
      throw new Error('这不是你的故事');
    }
    return this.storiesService.remove(id);
  }
}
