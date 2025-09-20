export interface ApiErrorJSON {
  message: string;
  httpStatus: number;
  errorCode: string;
  timestamp: number;
}

export interface AppErrorProps {
  message: string;
  internal?: string;
  httpStatus: number;
  errorCode: string;
}

export class AppError extends Error {
  message: string;
  internal?: string;
  httpStatus: number;
  errorCode: string;
  timestamp: number;

  constructor(props: AppErrorProps) {
    super(props.message);
    Object.assign(this, props);
    this.timestamp = new Date().getTime();
  }

  toJSON(): ApiErrorJSON {
    return {
      message: this.message,
      httpStatus: this.httpStatus,
      errorCode: this.errorCode,
      timestamp: this.timestamp,
    };
  }

  getInternal(): string | undefined {
    return this.internal;
  }
}
