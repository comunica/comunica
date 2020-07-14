import { Logger } from '@comunica/core';

/**
 * A logger that voids everything.
 */
export class LoggerVoid extends Logger {
  public debug(): void {
    // Void
  }

  public error(): void {
    // Void
  }

  public fatal(): void {
    // Void
  }

  public info(): void {
    // Void
  }

  public trace(): void {
    // Void
  }

  public warn(): void {
    // Void
  }
}
