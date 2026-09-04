import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  Response,
  Body,
} from '@nestjs/common';
import * as GitHub from '../lib/github';
import * as Steam from '../lib/steam';
import type {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from 'express';
import { AuthService } from './auth.service';
import Fishpi from 'fishpi';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from 'src/config/config.service';

export interface IRegisterBody {
  username: string;
  password: string;
  email: string;
  nickname?: string;
}

export interface ILoginBody {
  username: string;
  password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body()
    body: IRegisterBody,
  ) {
    if (!body.username || !body.password || !body.email) {
      throw new Error('用户名、密码和邮箱不能为空');
    }
    if (body.email.indexOf('@') === -1) {
      throw new Error('邮箱格式不正确');
    }
    return await this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: ILoginBody) {
    if (!body.username || !body.password) {
      throw new Error('用户名和密码不能为空');
    }
    return await this.authService.login(body);
  }

  @Get('login/fishpi')
  loginFishpi(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const fishpi = new Fishpi();
    const domain = new URL(
      req.headers.referer || `${req.protocol}://${req.headers.host}`,
    ).origin;
    res.redirect(fishpi.generateAuthURL(domain + '/#/login/fishpi'));
  }

  @Post('login/fishpi')
  async authFishpi(@Body() body) {
    const fishpi = new Fishpi();
    if (body['openid.mode'] === 'id_res') {
      const user = await fishpi.authVerify(body);
      if (user) {
        return await this.authService.loginFishpi(user);
      } else {
        throw new Error('Fishpi OAuth 验证失败');
      }
    } else {
      throw new Error('Fishpi OAuth 验证参数错误');
    }
  }

  @Get('login/github')
  loginGithub(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
  ) {
    const domain = new URL(
      req.headers.referer || `${req.protocol}://${req.headers.host}`,
    ).host;
    res.redirect(GitHub.getAuthUrl(domain));
  }

  @Post('login/github')
  async authGithub(@Request() req: ExpressRequest, @Body() body) {
    const domain = new URL(
      req.headers.referer || `${req.protocol}://${req.headers.host}`,
    ).host;
    const clientId = this.configService.get('github')?.clientId;
    if (!clientId) throw new Error('GitHub OAuth 未配置，请联系管理员');
    if (body['code']) {
      const authResult = await this.authService.loginGithub(body, domain);
      return authResult;
    }
    throw new Error('GitHub OAuth 验证参数错误');
  }

  @Get('login/steam')
  async loginSteam(
    @Request() req: ExpressRequest,
    @Response({ passthrough: true }) res: ExpressResponse,
    @Query() query,
  ) {
    const domain = new URL(
      req.headers.referer || `${req.protocol}://${req.headers.host}`,
    ).host;
    if (query['openid.mode'] === 'id_res') {
      const steamid = await Steam.verify(query);
      if (steamid) {
        return await this.authService.loginSteam(steamid);
      }
    } else {
      res.redirect(Steam.getAuthUrl(domain));
    }
  }

  @Post('login/steam')
  async authSteam(@Body() body) {
    if (body['openid.mode'] === 'id_res') {
      const steamid = await Steam.verify(body);
      if (steamid) {
        return await this.authService.loginSteam(steamid);
      } else {
        throw new Error('Steam OAuth 验证失败');
      }
    }
    throw new Error('Steam OAuth 验证参数错误');
  }

  @Get('login/support')
  loginSupport() {
    const thirds: string[] = [];
    if (this.configService.get('github')?.clientId) {
      thirds.push('github');
    }
    if (this.configService.get('steam')?.apiKey) {
      thirds.push('steam');
    }
    return {
      thirdParty: thirds,
    };
  }
}
