import { accessSync, createReadStream, constants } from 'fs';
import { fileURLToPath } from 'url';
import type { IActionDereference, IActorDereferenceArgs, IActorDereferenceOutput } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica File Dereference Actor.
 */
export class ActorDereferenceFile extends ActorDereference {
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  public async test({ url }: IActionDereference): Promise<IActorTest> {
    try {
      accessSync(getPath(url), constants.F_OK);
    } catch (error: unknown) {
      throw new Error(`This actor only works on existing local files. (${error})`);
    }
    return true;
  }

  public async run({ url }: IActionDereference): Promise<IActorDereferenceOutput> {
    const requestTimeStart = Date.now();
    return {
      data: createReadStream(getPath(url)),
      // This should always be after the creation of the read stream
      requestTime: Date.now() - requestTimeStart,
      exists: true,
      url,
    };
  }
}

const getPath = (url: string): string => url.startsWith('file://') ? fileURLToPath(url) : url;
