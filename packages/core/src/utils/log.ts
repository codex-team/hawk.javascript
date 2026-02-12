export type LogType = 'log' | 'warn' | 'error' | 'info';

export interface Logger {
  (msg: string, type?: LogType, args?: unknown): void;
}
