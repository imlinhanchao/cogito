import { IsIn, IsOptional, IsString } from 'class-validator';

export class StoryRuntimeExecuteDto {
  @IsString()
  dataset: string;

  @IsOptional()
  @IsString()
  target?: string;

  @IsOptional()
  @IsIn(['goto', 'action'])
  type?: 'goto' | 'action';

  @IsOptional()
  @IsString()
  action?: string;
}
