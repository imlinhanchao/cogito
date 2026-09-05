import { IsString, IsOptional } from 'class-validator';

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
  @IsString()
  status?: 'draft' | 'pending' | 'published' | 'rejected';
}

export class RejectDto {
  @IsString()
  reason?: string;
}
