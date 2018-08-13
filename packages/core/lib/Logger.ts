/**
 * A logger accepts messages from different levels
 * and emits them in a certain way.
 */
export abstract class Logger {

  /**
   * All available logging levels.
   * @type {{trace: number; debug: number; info: number; warn: number; error: number; fatal: number}}
   */
  // tslint:disable:object-literal-sort-keys
  public static readonly LEVELS: {[id: string]: number} = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5,
  };

  /**
   * Convert a string-based logging level to a numerical logging level.
   * @param level A string-based logging level
   * @return The numerical logging level, or undefined.
   */
  public static getLevelOrdinal(level: string): number {
    return Logger.LEVELS[level];
  }

  public abstract trace(message: string, data?: any): void;
  public abstract debug(message: string, data?: any): void;
  public abstract info(message: string, data?: any): void;
  public abstract warn(message: string, data?: any): void;
  public abstract error(message: string, data?: any): void;
  public abstract fatal(message: string, data?: any): void;
}

/**
 * @type {string} Context entry for a logger instance.
 * @value {Logger} A logger.
 */
export const KEY_CONTEXT_LOG: string = '@comunica/core:log';
