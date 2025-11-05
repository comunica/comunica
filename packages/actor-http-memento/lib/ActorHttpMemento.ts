import type { ActionHttp, IActorHttpArgs, ActorHttpOutput, MediatorHttp } from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttpMemento } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { parse } from 'http-link-header';

/**
 * A comunica Memento Http Actor.
 */
export class ActorHttpMemento extends ActorHttp {
  public readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpMementoArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
  }

  public async test(action: ActionHttp): Promise<TestResult<IActorTest>> {
    if (!(action.context.has(KeysHttpMemento.datetime) &&
          action.context.get(KeysHttpMemento.datetime) instanceof Date)) {
      return failTest('This actor only handles request with a set valid datetime.');
    }
    if (action.init && new Headers(action.init.headers).has('accept-datetime')) {
      return failTest('The request already has a set datetime.');
    }
    return passTestVoid();
  }

  public async run(action: ActionHttp): Promise<ActorHttpOutput> {
    // Duplicate the ActionHttp to append a datetime header to the request.
    const init: RequestInit = action.init ? { ...action.init } : {};
    const headers: Headers = init.headers = new Headers(init.headers ?? {});

    const dateTime: Date | undefined = action.context.get(KeysHttpMemento.datetime);
    if (dateTime) {
      headers.append('accept-datetime', dateTime.toUTCString());
    }

    const httpAction: ActionHttp = { context: action.context, input: action.input, init };

    // Execute the request and follow the timegate in the response (if any).
    const { response } = await this.mediatorHttp.mediate(httpAction);

    // Did we ask for a time-negotiated response, but haven't received one?
    if (headers.has('accept-datetime') && response.headers && !response.headers.has('memento-datetime')) {
      // The links might have a timegate that can help us
      const header = response.headers.get('link');
      const timegate = header && parse(header)?.get('rel', 'timegate');
      if (timegate && timegate.length > 0) {
        await response.body?.cancel();
        // Respond with a time-negotiated response from the timegate instead
        const followLink: ActionHttp = { context: action.context, input: timegate[0].uri, init };
        return this.mediatorHttp.mediate(followLink);
      }
    }

    return { type: 'response', response };
  }
}

export interface IActorHttpMementoArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator
   */
  mediatorHttp: MediatorHttp;
}
