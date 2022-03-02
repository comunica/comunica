import type { LogLevelString, Stream } from 'bunyan';

/**
 * BunyanStreamProvider is able to create bunyan streams.
 */
export abstract class BunyanStreamProvider {
  public readonly name: string;
  public readonly level: LogLevelString;

  public constructor(args: IBunyanStreamProviderArgs) {
    Object.assign(this, args);
  }

  public abstract createStream(): Stream;
}

export interface IBunyanStreamProviderArgs {
  /**
   * The name of this logger
   * @default {comunica}
   */
  name?: string;
  /**
   * The logging level to emit
   */
  level?: LogLevelString;
}
