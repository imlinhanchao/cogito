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
import { StoriesService } from './stories.service';
import { StoryDto } from './stories.dto';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  async list(@Query('page') page?: number, @Query('limit') limit?: number) {
    const p = page || 1;
    const l = limit || 20;
    return this.storiesService.findAll(p, l);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.storiesService.findOne(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: StoryDto, @Request() req) {
    if (!dto.authorId && req?.user?.userId) dto.authorId = req.user.userId;
    return this.storiesService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Partial<StoryDto>) {
    return this.storiesService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.storiesService.remove(id);
  }
}
