import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * OptionalAuthGuard 尝试验证 JWT；当没有或不合法时不会阻止请求。
 * 若请求中包含有效 token，则在 handler 中可通过 `req.user` 访问用户信息。
 */
@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    // 不抛出 Unauthorized，这样未认证请求也能继续执行
    // 仅在验证成功的情况下返回 user，否则返回 null
    if (err) {
      return null;
    }
    return user || null;
  }
}
