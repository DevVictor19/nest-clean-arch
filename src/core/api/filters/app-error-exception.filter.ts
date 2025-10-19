import { ExceptionFilter, Catch, ArgumentsHost } from '@nestjs/common';
import { Response } from 'express';
import { AppError } from '@/core/domain/errors/app-error';

@Catch(AppError)
export class AppErrorExceptionFilter implements ExceptionFilter {
  catch(exception: AppError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(exception.httpStatus).json(exception.toJSON());
  }
}
