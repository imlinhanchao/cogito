import { Module } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { StoriesModule } from './stories/stories.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: ConfigService.isConfigured()
    ? [
        TypeOrmModule.forRoot({
          type: 'mysql',
          ...ConfigService.getConfig()?.db,
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        }),
        AuthModule,
        StoriesModule,
      ]
    : [ConfigModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
