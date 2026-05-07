import { Logger } from '@comunica/types';

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
// eslint-disable-next-line ts/no-require-imports
import objectInspect = require('object-inspect');

const process: NodeJS.Process = require('process/');

/**
 * A logger that pretty-prints everything.
 */
export class LoggerPretty extends Logger {
  /** ANSI escape code to reset terminal color. */
  public static readonly COLOR_RESET: string = '\u001B[0m';
  /** ANSI escape code for red text. */
  public static readonly COLOR_RED: string = '\u001B[31m';
  /** ANSI escape code for green text. */
  public static readonly COLOR_GREEN: string = '\u001B[32m';
  /** ANSI escape code for yellow text. */
  public static readonly COLOR_YELLOW: string = '\u001B[33m';
  /** ANSI escape code for blue text. */
  public static readonly COLOR_BLUE: string = '\u001B[34m';
  /** ANSI escape code for magenta text. */
  public static readonly COLOR_MAGENTA: string = '\u001B[35m';
  /** ANSI escape code for cyan text. */
  public static readonly COLOR_CYAN: string = '\u001B[36m';
  /** ANSI escape code for gray text. */
  public static readonly COLOR_GRAY: string = '\u001B[90m';

  private readonly level: string;
  private readonly levelOrdinal: number;
  private readonly actors?: Record<string, boolean>;
  /**
   * Creates a new pretty-printing logger.
   * @param args The logger configuration including minimum level and optional actor filter.
   */
  public constructor(args: ILoggerPrettyArgs) {
    super();
    this.level = args.level;
    this.levelOrdinal = Logger.getLevelOrdinal(this.level);
    this.actors = args.actors;
  }

  /**
   * Logs a message at the debug level in gray.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public debug(message: string, data?: any): void {
    this.log('debug', LoggerPretty.COLOR_GRAY, message, data);
  }

  /**
   * Logs a message at the error level in red.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public error(message: string, data?: any): void {
    this.log('error', LoggerPretty.COLOR_RED, message, data);
  }

  /**
   * Logs a message at the fatal level in cyan.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public fatal(message: string, data?: any): void {
    this.log('fatal', LoggerPretty.COLOR_CYAN, message, data);
  }

  /**
   * Logs a message at the info level in green.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public info(message: string, data?: any): void {
    this.log('info', LoggerPretty.COLOR_GREEN, message, data);
  }

  /**
   * Logs a message at the trace level in blue.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public trace(message: string, data?: any): void {
    this.log('trace', LoggerPretty.COLOR_BLUE, message, data);
  }

  /**
   * Logs a message at the warn level in yellow, grouping repeated warnings.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
  public warn(message: string, data?: any): void {
    this.logGrouped(message, (count) => {
      const suffix = count > 1 ? ` (${count} times)` : '';
      this.log('warn', LoggerPretty.COLOR_YELLOW, `${message}${suffix}`, data);
    });
  }

  /**
   * Writes a formatted, colorized log entry to stderr if the level meets the threshold.
   * @param level The log level string.
   * @param color The ANSI color code to apply.
   * @param message The log message.
   * @param data Optional structured data to include.
   */
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
