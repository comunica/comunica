import {Logger} from "@comunica/core";

/**
 * A logger that voids everything.
 */
export class LoggerVoid extends Logger {

  public debug(message: string, data?: any): void {
    // Void
  }

  public error(message: string, data?: any): void {
    // Void
  }

  public fatal(message: string, data?: any): void {
    // Void
  }

  public info(message: string, data?: any): void {
    // Void
  }

  public trace(message: string, data?: any): void {
    // Void
  }

  public warn(message: string, data?: any): void {
    // Void
  }

}
