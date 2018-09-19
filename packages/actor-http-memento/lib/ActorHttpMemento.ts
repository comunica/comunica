import { ActorHttp, IActionHttp, IActorHttpOutput } from "@comunica/bus-http";
import { ActionContext, IActorArgs, IActorTest, Mediator } from "@comunica/core";
import "isomorphic-fetch";
import * as parseLink from 'parse-link-header';

/**
 * A comunica Memento Http Actor.
 */
export class ActorHttpMemento extends ActorHttp {

  public readonly mediatorHttp: Mediator<ActorHttp,
    IActionHttp, IActorTest, IActorHttpOutput>;

  constructor(args: IActorHttpMementoArgs) {
    super(args);
  }

  public async test(action: IActionHttp): Promise<IActorTest> {
    if (!(action.context && action.context.has(KEY_CONTEXT_DATETIME) &&
          action.context.get(KEY_CONTEXT_DATETIME) instanceof Date)) {
      throw new Error('This actor only handles request with a set valid datetime.');
    }
    if (action.init && new Headers(action.init.headers || {}).has('accept-datetime')) {
      throw new Error('The request already has a set datetime.');
    }
    return true;
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    // Duplicate the ActionHttp to append a datetime header to the request.
    const init: RequestInit = action.init ? {...action.init} : {};
    const headers: Headers = init.headers = new Headers(init.headers || {});

    if (action.context && action.context.has(KEY_CONTEXT_DATETIME)) {
      headers.append('accept-datetime', action.context.get(KEY_CONTEXT_DATETIME).toUTCString());
    }

    const httpAction: IActionHttp = { context: action.context, input: action.input, init };

    // Execute the request and follow the timegate in the response (if any).
    const result: IActorHttpOutput = await this.mediatorHttp.mediate(httpAction);

    // Did we ask for a time-negotiated response, but haven't received one?
    if (headers.has('accept-datetime') && result.headers && !result.headers.has('memento-datetime')) {
      // The links might have a timegate that can help us
      const links = result.headers.has('link') && parseLink(result.headers.get('link'));
      if (links && links.timegate) {
        result.body.cancel();
        // Respond with a time-negotiated response from the timegate instead
        const followLink: IActionHttp = { context: action.context, input: links.timegate.url, init };
        return this.mediatorHttp.mediate(followLink);
      }
    }

    return result;
  }
}

export interface IActorHttpMementoArgs
  extends IActorArgs<IActionHttp, IActorTest, IActorHttpOutput> {
  mediatorHttp: Mediator<ActorHttp,
  IActionHttp, IActorTest, IActorHttpOutput>;
}

/**
 * @type {string} Context entry for the desired datetime.
 */
export const KEY_CONTEXT_DATETIME = '@comunica/actor-http-memento:datetime';
