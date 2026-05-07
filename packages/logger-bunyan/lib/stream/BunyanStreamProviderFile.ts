import { URL } from 'node:url';
import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

/**
 * A file bunyan stream provider.
 */
export class BunyanStreamProviderFile extends BunyanStreamProvider {
  /** The file path to write log output to. */
  public readonly path: string;

  /**
   * Creates a new file stream provider targeting the given path.
   * @param args The file stream provider arguments including the file path.
   */
  public constructor(args: IBunyanStreamProviderFileArgs) {
    super(args);
    this.path = args.path;
  }

  /**
   * Creates a bunyan stream that writes to a file.
   * @return A bunyan file stream configuration.
   */
  public createStream(): Stream {
    return { type: 'file', name: this.name, path: <any> new URL(this.path), level: this.level };
  }
}

/**
 * Arguments for constructing a {@link BunyanStreamProviderFile}.
 */
export interface IBunyanStreamProviderFileArgs extends IBunyanStreamProviderArgs {
  /**
   * Path to the target log file
   */
  path: string;
}
