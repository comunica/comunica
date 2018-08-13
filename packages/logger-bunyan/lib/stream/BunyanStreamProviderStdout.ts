import {Stream} from "bunyan";
import {BunyanStreamProvider, IBunyanStreamProviderArgs} from "./BunyanStreamProvider";

/**
 * A stdout bunyan stream provider.
 */
export class BunyanStreamProviderStdout extends BunyanStreamProvider {

  constructor(args: IBunyanStreamProviderArgs) {
    super(args);
  }

  public createStream(): Stream {
    return { name: this.name, stream: process.stdout, level: this.level };
  }

}
