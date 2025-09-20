export interface ApiErrorJSON {
  message: string;
  httpStatus?: number;
  errorCode?: string;
  timestamp: number;
}

export type AppErrorProps = {
  message: string;
  internal?: string;
  httpStatus?: number;
  errorCode?: string;
  error?: Error;
};

export class AppError {
  private message: string;
  private internal?: string;
  private timestamp: number;
  private httpStatus?: number;
  private errorCode?: string;
  private error?: Error;

  constructor(props: AppErrorProps) {
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

  getError(): Error | undefined {
    return this.error;
  }

  getInternal(): string | undefined {
    return this.internal;
  }
}
