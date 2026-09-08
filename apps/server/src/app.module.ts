import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigService } from './config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayModule } from './play/play.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StoriesModule } from './stories/stories.module';
import { ConfigModule } from './config/config.module';
import { join } from 'path';

@Module({
  imports: ConfigService.isConfigured()
    ? [
        TypeOrmModule.forRoot({
          type: 'mysql',
          ...ConfigService.getConfig()?.db,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', 'public'),
          exclude: ['/api/'], // 排除 API 路径
        }),
        AuthModule,
        StoriesModule,
        PlayModule,
      ]
    : [ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
