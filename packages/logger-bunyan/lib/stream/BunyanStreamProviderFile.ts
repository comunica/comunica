import { URL } from 'url';
import type { Stream } from 'bunyan';
import type { IBunyanStreamProviderArgs } from './BunyanStreamProvider';
import { BunyanStreamProvider } from './BunyanStreamProvider';

/**
 * A file bunyan stream provider.
 */
export class BunyanStreamProviderFile extends BunyanStreamProvider {
  public readonly path: string;

  public constructor(args: IBunyanStreamProviderFileArgs) {
    super(args);
  }

  public createStream(): Stream {
    return { type: 'file', name: this.name, path: <any> new URL(this.path), level: this.level };
  }
}

export interface IBunyanStreamProviderFileArgs extends IBunyanStreamProviderArgs {
  path: string;
}
