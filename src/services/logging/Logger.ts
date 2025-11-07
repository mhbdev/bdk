export interface Logger {
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, meta?: Record<string, any>): void;
}

export class DefaultLogger implements Logger {
  info(message: string, meta?: Record<string, any>): void {
    // eslint-disable-next-line no-console
    console.log(`[info] ${message}`, meta ?? '');
  }
  warn(message: string, meta?: Record<string, any>): void {
    // eslint-disable-next-line no-console
    console.warn(`[warn] ${message}`, meta ?? '');
  }
  error(message: string, meta?: Record<string, any>): void {
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}`, meta ?? '');
  }
}