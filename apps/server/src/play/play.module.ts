import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Play } from './play.entity';
import { PlayService } from './play.service';
import { PlayController } from './play.controller';
import { StoriesModule } from '../stories/stories.module';
import { PlayUnlock } from './play.unlock.entity';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Play]),
    TypeOrmModule.forFeature([PlayUnlock]),
    StoriesModule,
    UsersModule,
  ],
  providers: [PlayService],
  controllers: [PlayController],
  exports: [PlayService],
})
export class PlayModule {}
