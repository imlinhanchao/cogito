import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
  stack?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // 响应已被手动发送（如使用了 @Res() 并在其中调用 res.redirect()），
        // 不再包裹/发送，否则会抛 ERR_HTTP_HEADERS_SENT。
        const res = context.switchToHttp().getResponse();
        if (res?.headersSent) {
          return data as unknown as ApiResponse<T>;
        }
        return {
          code: 0,
          msg: 'success',
          data,
        };
      }),
    );
  }
}
