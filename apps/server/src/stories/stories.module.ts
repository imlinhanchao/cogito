import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from './story.entity';
import { ApprovedStory } from './approved-story.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';
import { UsersModule } from 'src/users/users.module';
import { StoryRuntimeService } from './story-runtime.service';

@Module({
  imports: [TypeOrmModule.forFeature([Story, ApprovedStory]), UsersModule],
  providers: [StoriesService, StoryRuntimeService],
  controllers: [StoriesController],
  exports: [StoriesService, StoryRuntimeService],
})
export class StoriesModule {}
