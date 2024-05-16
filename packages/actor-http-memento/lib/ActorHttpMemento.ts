import type { IActionHttp, IActorHttpArgs, IActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpMemento } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';
import 'cross-fetch/polyfill';

// Use require instead of import for default exports, to be compatible with variants of esModuleInterop in tsconfig.
// eslint-disable-next-line ts/no-require-imports
import parseLink = require('parse-link-header');

/**
 * A comunica Memento Http Actor.
 */
export class ActorHttpMemento extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpMementoArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    if (!(action.context.has(KeysHttpMemento.datetime) &&
          action.context.get(KeysHttpMemento.datetime) instanceof Date)) {
      throw new Error('This actor only handles request with a set valid datetime.');
    }
    if (action.init && new Headers(action.init.headers).has('accept-datetime')) {
      throw new Error('The request already has a set datetime.');
    }
    return true;
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    // Duplicate the ActionHttp to append a datetime header to the request.
    const init: RequestInit = action.init ? { ...action.init } : {};
    const headers: Headers = init.headers = new Headers(init.headers ?? {});

    const dateTime: Date | undefined = action.context.get(KeysHttpMemento.datetime);
    if (dateTime) {
      headers.append('accept-datetime', dateTime.toUTCString());
    }

    const httpAction: IActionHttp = { context: action.context, input: action.input, init };

    // Execute the request and follow the timegate in the response (if any).
    const result: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Did we ask for a time-negotiated response, but haven't received one?
    if (headers.has('accept-datetime') && result.headers && !result.headers.has('memento-datetime')) {
      // The links might have a timegate that can help us
      const links = result.headers.has('link') && parseLink(result.headers.get('link'));
      if (links && links.timegate) {
        await result.body?.cancel();
        // Respond with a time-negotiated response from the timegate instead
        const followLink: IActionHttp = { context: action.context, input: links.timegate.url, init };
        return this.mediatorHttp.mediate(followLink);
      }
    }

    return result;
  }
}

export interface IActorHttpMementoArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
