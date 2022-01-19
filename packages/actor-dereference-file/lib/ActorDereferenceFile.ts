import { ActorDereference, IActionDereference, IActorDereferenceArgs, IActorDereferenceOutput } from '@comunica/bus-dereference';
import { IActorTest } from '@comunica/core';
import * as fs from 'fs';
import { URL } from 'url';
import { promisify } from 'util';

function getPath({ url }: { url: string }) {
  return url.startsWith('file://') ? new URL(url) : url
}

/**
 * A comunica File Dereference Actor.
 */
export class ActorDereferenceFile extends ActorDereference {
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  public async test(action: IActionDereference): Promise<IActorTest> {
    try {
      await promisify(fs.access)(getPath(action), fs.constants.F_OK);
    } catch (error: unknown) {
      throw new Error(`This actor only works on existing local files. (${error})`);
    }
    return true;
  }

  public async run(action: IActionDereference): Promise<IActorDereferenceOutput> {
    const requestTimeStart = Date.now();

    return {
      data: fs.createReadStream(getPath(action)),
      // This should always be after the creation of the read stream
      requestTime: Date.now() - requestTimeStart,
      exists: true,
      url: action.url
    }
  }
}
