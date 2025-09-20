import { AppError } from './app-error';

export enum ErrorCodes {
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

export class BadRequestError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 400,
      errorCode: errorCode ?? ErrorCodes.BAD_REQUEST,
    });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 404,
      errorCode: errorCode ?? ErrorCodes.NOT_FOUND,
    });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 401,
      errorCode: errorCode ?? ErrorCodes.UNAUTHORIZED,
    });
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 403,
      errorCode: errorCode ?? ErrorCodes.FORBIDDEN,
    });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 409,
      errorCode: errorCode ?? ErrorCodes.CONFLICT,
    });
  }
}

export class UnprocessableEntityError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 422,
      errorCode: errorCode ?? ErrorCodes.UNPROCESSABLE_ENTITY,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(message: string, errorCode?: string, internal?: string) {
    super({
      message,
      internal,
      httpStatus: 500,
      errorCode: errorCode ?? ErrorCodes.INTERNAL_SERVER_ERROR,
    });
  }
}
