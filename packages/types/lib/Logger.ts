/**
 * A logger accepts messages from different levels
 * and emits them in a certain way.
 */
export abstract class Logger {
  /**
   * All available logging levels.
   * @type {{trace: number; debug: number; info: number; warn: number; error: number; fatal: number}}
   */

  public static readonly LEVELS: Record<string, number> = {
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

  protected readonly activeLogGroups: Record<string, {
    count: number;
    lastSeenIndex: number;
    callback: (count: number) => void;
  }> = {};

  protected repetitionCounter = 0;

  protected readonly groupedLogLimit = 5;

  public abstract trace(message: string, data?: any): void;
  public abstract debug(message: string, data?: any): void;
  public abstract info(message: string, data?: any): void;
  public abstract warn(message: string, data?: any): void;
  public abstract error(message: string, data?: any): void;
  public abstract fatal(message: string, data?: any): void;

  /**
   * Log a message that might be repeated, preventing console spam.
   * If the same key is passed multiple times,
   * only the first time the emit callback will be invoked immediately.
   * All subsequent calls will be buffered,
   * until at least {@link Logger#groupedLogLimit} other logGrouped calls are made,
   * or {@link Logger#flush} is called.
   * @param key A unique key for this message (e.g. the message template).
   * @param emit A callback to emit the message.
   */
  public logGrouped(key: string, emit: (count: number) => void): void {
    const pending = this.activeLogGroups[key];
    if (pending) {
      if (this.repetitionCounter - pending.lastSeenIndex - 1 < this.groupedLogLimit) {
        pending.count++;
        pending.lastSeenIndex = this.repetitionCounter++;
        return;
      }
      delete this.activeLogGroups[key];
      if (pending.count > 0) {
        pending.callback(pending.count);
      }
    }

    this.activeLogGroups[key] = { count: 0, lastSeenIndex: this.repetitionCounter++, callback: emit };
    emit(1);
  }

  /**
   * Flush all active log groups.
   */
  public flush(): void {
    for (const key in this.activeLogGroups) {
      const { count, callback } = this.activeLogGroups[key];
      delete this.activeLogGroups[key];
      if (count > 0) {
        callback(count);
      }
    }
  }
}
