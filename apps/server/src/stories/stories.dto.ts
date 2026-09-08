import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';

export class StoryDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  status?: 'draft' | 'pending' | 'published' | 'rejected';

  @IsOptional()
  @IsString()
  startPassage?: string;

  @IsOptional()
  @IsNumber()
  passageSize?: number;
}

export class RejectDto {
  @IsString()
  reason?: string;
}
