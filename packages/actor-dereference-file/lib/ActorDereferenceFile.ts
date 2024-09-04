import { accessSync, createReadStream, constants } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IActionDereference, IActorDereferenceArgs, IActorDereferenceOutput } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';

/**
 * A comunica File Dereference Actor.
 */
export class ActorDereferenceFile extends ActorDereference {
  public constructor(args: IActorDereferenceArgs) {
    super(args);
  }

  public async test({ url }: IActionDereference): Promise<TestResult<IActorTest>> {
    try {
      accessSync(getPath(url), constants.F_OK);
    } catch (error: unknown) {
      // eslint-disable-next-line ts/restrict-template-expressions
      return failTest(`This actor only works on existing local files. (${error})`);
    }
    return passTestVoid();
  }

  private static isURI(str: string): boolean {
    const URIRegex = /\w[\w+.-]*:.*/u;
    return URIRegex.exec(str) !== null;
  }

  public async run({ url }: IActionDereference): Promise<IActorDereferenceOutput> {
    const requestTimeStart = Date.now();
    return {
      data: createReadStream(getPath(url)),
      // This should always be after the creation of the read stream
      requestTime: Date.now() - requestTimeStart,
      exists: true,
      url: ActorDereferenceFile.isURI(url) ? url : pathToFileURL(url).href,
    };
  }
}

const getPath = (url: string): string => url.startsWith('file://') ? fileURLToPath(url) : url;
