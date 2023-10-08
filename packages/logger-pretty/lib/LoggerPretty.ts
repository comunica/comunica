import { Logger } from '@comunica/types';
import * as objectInspect from 'object-inspect';

const process: NodeJS.Process = require('process/');

/**
 * A logger that pretty-prints everything.
 */
export class LoggerPretty extends Logger {
  public static readonly COLOR_RESET: string = '\u001B[0m';
  public static readonly COLOR_RED: string = '\u001B[31m';
  public static readonly COLOR_GREEN: string = '\u001B[32m';
  public static readonly COLOR_YELLOW: string = '\u001B[33m';
  public static readonly COLOR_BLUE: string = '\u001B[34m';
  public static readonly COLOR_MAGENTA: string = '\u001B[35m';
  public static readonly COLOR_CYAN: string = '\u001B[36m';
  public static readonly COLOR_GRAY: string = '\u001B[90m';

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
    this.log('debug', LoggerPretty.COLOR_GRAY, message, data);
  }

  public error(message: string, data?: any): void {
    this.log('error', LoggerPretty.COLOR_RED, message, data);
  }

  public fatal(message: string, data?: any): void {
    this.log('fatal', LoggerPretty.COLOR_CYAN, message, data);
  }

  public info(message: string, data?: any): void {
    this.log('info', LoggerPretty.COLOR_GREEN, message, data);
  }

  public trace(message: string, data?: any): void {
    this.log('trace', LoggerPretty.COLOR_BLUE, message, data);
  }

  public warn(message: string, data?: any): void {
    this.log('warn', LoggerPretty.COLOR_YELLOW, message, data);
  }

  protected log(level: string, color: string, message: string, data?: any): void {
    if (Logger.getLevelOrdinal(level) >= this.levelOrdinal &&
      (!data || !('actor' in data) || !this.actors || this.actors[data.actor])) {
      process.stderr.write(LoggerPretty.withColor(`[${new Date().toISOString()}]  ${level.toUpperCase()}: ${message} ${objectInspect(data)}\n`, color));
    }
  }

  /**
   * Return a string in a given color
   * @param str The string that should be printed in
   * @param color A given color
   */
  public static withColor(str: any, color: string): string {
    return `${color}${str}${LoggerPretty.COLOR_RESET}`;
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
