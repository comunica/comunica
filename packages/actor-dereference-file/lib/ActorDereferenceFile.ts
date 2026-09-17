import { accessSync, createReadStream, constants } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { IActionDereference, IActorDereferenceArgs, IActorDereferenceOutput } from '@comunica/bus-dereference';
import { ActorDereference } from '@comunica/bus-dereference';
import { KeysDereference, KeysInitQuery } from '@comunica/context-entries';
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

  public async run(action: IActionDereference): Promise<IActorDereferenceOutput> {
    const { url, context } = action;

    // Dereferencing local files can be blocked within certain scopes, such as SERVICE targets.
    if (context.get(KeysDereference.blockFileAccess)) {
      return this.handleDereferenceErrors(action, new Error(
        `Dereferencing the local file '${url}' is not allowed within this scope. `,
      ));
    }

    return {
      data: createReadStream(getPath(url)),
      // Local files have no request latency, and `createReadStream` returns before the file is opened,
      // so timing it only measures clock granularity. The 0 or 1 it yields is then reported as the
      // per-request time of every pattern over this source, where bind joins multiply it by the
      // cardinality of the stream they bind, making a plan flip on a millisecond of measurement noise.
      requestTime: 0,
      status: 200,
      exists: true,
      url: ActorDereferenceFile.isURI(url) ? url : pathToFileURL(url).href,
      baseIRI: context.get(KeysInitQuery.fileBaseIRI),
    };
  }
}

const getPath = (url: string): string => url.startsWith('file://') ? fileURLToPath(url) : url;
