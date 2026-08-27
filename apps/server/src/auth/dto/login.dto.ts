import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user-001' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ example: 'demo-user' })
  @IsString()
  @IsNotEmpty()
  username: string;
}
