import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

const process: NodeJS.Process = require('process/');

/**
 * A stdout bunyan stream provider.
 */
export class BunyanStreamProviderStdout extends BunyanStreamProvider {
  /**
   * Creates a new stdout stream provider.
   * @param args The stream provider arguments.
   */
  public constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  /**
   * Creates a bunyan stream that writes to stdout.
   * @return A bunyan stream configuration targeting stdout.
   */
  public createStream(): Stream {
    return { name: this.name, stream: process.stdout, level: this.level };
  }
}
