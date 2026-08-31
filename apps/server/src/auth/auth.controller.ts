import { Controller, Get, Query, Request, Response } from '@nestjs/common';
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

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('login/fishpi')
  async login(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
    @Query() query,
  ) {
    const fishpi = new Fishpi();
    if (query['openid.mode'] === 'id_res') {
      const user = await fishpi.authVerify(query);
      if (user) {
        return await this.authService.login(user);
      } else {
        throw new Error('Fishpi OAuth 验证失败');
      }
    } else {
      const domain = new URL(
        req.headers.referer || `${req.protocol}://${req.headers.host}`,
      ).origin;
      res.redirect(fishpi.generateAuthURL(domain + '/#/login/fishpi'));
    }
  }

  @Get('login/github')
  async loginGithub(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
    @Query() query,
  ) {
    const domain = new URL(
      req.headers.referer || `${req.protocol}://${req.headers.host}`,
    ).host;
    const clientId = ConfigService.get('github')?.clientId;
    if (!clientId) return res.end('GitHub OAuth 未配置，请联系管理员');
    if (req.query['code']) {
      const authResult = await this.authService.loginGithub(query, domain);
      return authResult;
    }
    res.redirect(GitHub.getAuthUrl(domain));
  }

  @Get('login/steam')
  async loginSteam(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
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

  @Get('login/support')
  loginSupport() {
    const thirds: string[] = [];
    if (ConfigService.get('github')?.clientId) {
      thirds.push('github');
    }
    if (ConfigService.get('steam')?.apiKey) {
      thirds.push('steam');
    }
    return {
      thirdParty: thirds,
    };
  }
}
