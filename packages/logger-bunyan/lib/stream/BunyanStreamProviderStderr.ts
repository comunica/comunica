import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

const process: NodeJS.Process = require('process/');

/**
 * A stderr bunyan stream provider.
 */
export class BunyanStreamProviderStderr extends BunyanStreamProvider {
  /**
   * Creates a new stderr stream provider.
   * @param args The stream provider arguments.
   */
  public constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  /**
   * Creates a bunyan stream that writes to stderr.
   * @return A bunyan stream configuration targeting stderr.
   */
  public createStream(): Stream {
    return { name: this.name, stream: process.stderr, level: this.level };
  }
}
