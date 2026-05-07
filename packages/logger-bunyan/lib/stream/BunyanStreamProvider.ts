import type { LogLevelString, Stream } from 'bunyan';

/**
 * BunyanStreamProvider is able to create bunyan streams.
 */
export abstract class BunyanStreamProvider {
  /** The optional name of this stream. */
  public readonly name: string | undefined;
  /** The optional logging level for this stream. */
  public readonly level: LogLevelString | undefined;

  /**
   * Creates a new stream provider with the given configuration.
   * @param args The stream provider arguments including name and level.
   */
  public constructor(args: IBunyanStreamProviderArgs) {
    this.name = args.name;
    this.level = args.level;
  }

  /**
   * Creates a bunyan-compatible stream.
   * @return A bunyan stream configuration object.
   */
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
