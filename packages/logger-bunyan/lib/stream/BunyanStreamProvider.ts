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
  name?: string;
  level?: LogLevelString;
}
