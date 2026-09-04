import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class StoryDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsString()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
