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
import { AdminGuard } from '../auth/admin.guard';
import { StoriesService } from './stories.service';
import { StoryDto, RejectDto } from './stories.dto';

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
    // 接口传 authorId 且与已认证的用户不一致，则视为公开请求，不返回草稿
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

  @UseGuards(JwtAuthGuard)
  @Put(':id/publish')
  async publish(@Param('id') id: string, @Request() req) {
    return this.storiesService.publish(id, req.user.userId);
  }

  // 管理员：列出待审核的故事（未发布）
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/pending')
  async pending(@Query('limit') limit?: number) {
    const res = await this.storiesService.findAll(
      Date.now(),
      limit || 50,
      undefined,
      undefined,
      false,
    );
    // filter pending submissions
    const pending = res.data.filter((s) => s.status === 'pending');
    return { data: pending, total: pending.length };
  }

  // 管理员审核通过并上架
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/approve')
  async approve(@Param('id') id: string, @Request() req) {
    const adminId = req.user.userId;
    return this.storiesService.approve(id, adminId);
  }

  // 管理员拒绝投稿
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectDto,
    @Request() req,
  ) {
    const adminId = req.user.userId;
    return this.storiesService.reject(id, adminId, body?.reason);
  }
}
