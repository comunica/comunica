import {Logger} from "@comunica/core";
import BunyanLogger = require("bunyan");
import {LogLevelString} from "bunyan";
import {BunyanStreamProvider} from "./stream/BunyanStreamProvider";

/**
 * A bunyan-based logger implementation.
 */
export class LoggerBunyan extends Logger {

  private readonly bunyanLogger: BunyanLogger;

  constructor(args: ILoggerBunyanArgs) {
    super();
    args.streams = args.streamProviders.map((p) => p.createStream());
    delete args.streamProviders;
    this.bunyanLogger = BunyanLogger.createLogger(args);
  }

  public fatal(message: string, data?: any): void {
    this.bunyanLogger.fatal(data, message);
  }

  public error(message: string, data?: any): void {
    this.bunyanLogger.error(data, message);
  }

  public warn(message: string, data?: any): void {
    this.bunyanLogger.warn(data, message);
  }

  public info(message: string, data?: any): void {
    this.bunyanLogger.info(data, message);
  }

  public debug(message: string, data?: any): void {
    this.bunyanLogger.debug(data, message);
  }

  public trace(message: string, data?: any): void {
    this.bunyanLogger.trace(data, message);
  }

}

export interface ILoggerBunyanArgs {
  name: string;
  streamProviders: BunyanStreamProvider[];
  level?: LogLevelString;
  [custom: string]: any;
}
