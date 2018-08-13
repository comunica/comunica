import {Stream} from "bunyan";
import {BunyanStreamProvider, IBunyanStreamProviderArgs} from "./BunyanStreamProvider";

/**
 * A stderr bunyan stream provider.
 */
export class BunyanStreamProviderStderr extends BunyanStreamProvider {

  constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  public createStream(): Stream {
    return { name: this.name, stream: process.stderr, level: this.level };
  }

}
