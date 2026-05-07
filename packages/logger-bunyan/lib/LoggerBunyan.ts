import { Logger } from '@comunica/types';
import BunyanLogger = require('bunyan');
import type { LogLevelString } from 'bunyan';
import type { BunyanStreamProvider } from './stream/BunyanStreamProvider';

/**
 * A bunyan-based logger implementation.
 */
export class LoggerBunyan extends Logger {
  private readonly bunyanLogger: BunyanLogger;

  /**
   * Creates a new Bunyan-based logger from the given arguments.
   * @param args The logger configuration including name, stream providers, and level.
   */
  public constructor(args: ILoggerBunyanArgs) {
    super();
    args.streams = args.streamProviders.map(provider => provider.createStream());
    this.bunyanLogger = BunyanLogger.createLogger(args);
  }

  /**
   * Logs a message at the fatal level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public fatal(message: string, data?: any): void {
    this.bunyanLogger.fatal(data, message);
  }

  /**
   * Logs a message at the error level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public error(message: string, data?: any): void {
    this.bunyanLogger.error(data, message);
  }

  /**
   * Logs a message at the warn level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public warn(message: string, data?: any): void {
    this.bunyanLogger.warn(data, message);
  }

  /**
   * Logs a message at the info level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public info(message: string, data?: any): void {
    this.bunyanLogger.info(data, message);
  }

  /**
   * Logs a message at the debug level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public debug(message: string, data?: any): void {
    this.bunyanLogger.debug(data, message);
  }

  /**
   * Logs a message at the trace level.
   * @param message The log message.
   * @param data Optional structured data to include with the log entry.
   */
  public trace(message: string, data?: any): void {
    this.bunyanLogger.trace(data, message);
  }
}

export interface ILoggerBunyanArgs {
  /**
   * The name of this logger
   * @default {comunica}
   */
  name: string;
  /**
   * A stream to output to
   */
  streamProviders: BunyanStreamProvider[];
  /**
   * The logging level to emit
   * @range {string}
   */
  level?: LogLevelString;
  [custom: string]: any;
}
