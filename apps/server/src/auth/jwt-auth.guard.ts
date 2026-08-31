import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err, user, info) {
    if (info?.name === 'TokenExpiredError') {
      throw new UnauthorizedException({
        message: 'Token has expired',
        code: 40101,
      });
    }
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
