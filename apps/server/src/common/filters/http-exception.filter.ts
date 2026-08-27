import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorResponse = isHttpException ? exception.getResponse() : undefined;
    const msg = this.getMessage(errorResponse, exception);

    response.status(status).json({
      code: status,
      msg,
      data: {
        path: request.url,
        timestamp: new Date().toISOString(),
      },
      stack:
        process.env.NODE_ENV === 'production' ? null : this.getStack(exception),
    });
  }

  private getMessage(
    errorResponse: string | object | undefined,
    exception: unknown,
  ) {
    if (typeof errorResponse === 'string') {
      return errorResponse;
    }
    if (errorResponse && 'message' in errorResponse) {
      const message = errorResponse.message;
      return Array.isArray(message) ? message.join(', ') : message;
    }
    return exception instanceof Error
      ? exception.message
      : 'Internal server error';
  }

  private getStack(exception: unknown): string | null {
    return exception instanceof Error ? (exception.stack ?? null) : null;
  }
}
