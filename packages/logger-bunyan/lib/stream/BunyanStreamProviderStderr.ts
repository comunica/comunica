import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

/**
 * A stderr bunyan stream provider.
 */
export class BunyanStreamProviderStderr extends BunyanStreamProvider {
  public constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  public createStream(): Stream {
    return { name: this.name, stream: process.stderr, level: this.level };
  }
}
