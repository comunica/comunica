import type { LogLevelString, Stream } from 'bunyan';

/**
 * BunyanStreamProvider is able to create bunyan streams.
 */
export abstract class BunyanStreamProvider {
  public readonly name: string | undefined;
  public readonly level: LogLevelString | undefined;

  public constructor(args: IBunyanStreamProviderArgs) {
    this.name = args.name;
    this.level = args.level;
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
