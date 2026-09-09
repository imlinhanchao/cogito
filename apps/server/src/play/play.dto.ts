import { IsOptional, IsString } from 'class-validator';

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
