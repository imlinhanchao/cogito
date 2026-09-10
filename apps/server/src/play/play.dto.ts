import { IsOptional, IsString } from 'class-validator';
import { BaseStoryFields } from 'dist/stories/base-story.entity';

export class UpdatePlayDto {
  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  display?: string;
}

export class PlayStoryDto extends BaseStoryFields {
  storyId: string;
  points: { name: string; description: string }[];
  end: { name: string; description: string }[];
  isPlaying: boolean;
}
