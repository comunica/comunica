import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

const process: NodeJS.Process = require('process/');

/**
 * A stdout bunyan stream provider.
 */
export class BunyanStreamProviderStdout extends BunyanStreamProvider {
  public constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  public createStream(): Stream {
    return { name: this.name, stream: process.stdout, level: this.level };
  }
}
