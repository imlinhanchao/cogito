import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Story } from './story.entity';
import { StoriesService } from './stories.service';
import { StoriesController } from './stories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Story])],
  providers: [StoriesService],
  controllers: [StoriesController],
  exports: [StoriesService],
})
export class StoriesModule {}
