import { inspect } from 'util';
import { Logger } from '@comunica/core';

/**
 * A logger that pretty-prints everything.
 */
export class LoggerPretty extends Logger {
  private readonly level: string;
  private readonly levelOrdinal: number;
  private readonly actors?: Record<string, boolean>;

  public constructor(args: ILoggerPrettyArgs) {
    super();
    this.level = args.level;
    this.levelOrdinal = Logger.getLevelOrdinal(this.level);
    this.actors = args.actors;
  }

  public debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  public error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  public fatal(message: string, data?: any): void {
    this.log('fatal', message, data);
  }

  public info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  public trace(message: string, data?: any): void {
    this.log('trace', message, data);
  }

  public warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  protected log(level: string, message: string, data?: any): void {
    if (Logger.getLevelOrdinal(level) >= this.levelOrdinal &&
      (!data || !('actor' in data) || !this.actors || this.actors[data.actor])) {
      process.stderr.write(`[${new Date().toISOString()}]  ${level.toUpperCase()}: ${message} ${inspect(data)}\n`);
    }
  }
}

export interface ILoggerPrettyArgs {
  /**
   * The minimum logging level.
   */
  level: string;
  /**
   * A whitelist of actor IRIs to log for.
   */
  actors?: Record<string, boolean>;
}
