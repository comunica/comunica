import {ActionHttp, ActorHttpOutput, IActionHttpValidation, IActorHttpArgs, MediatorHttp} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import type { TestResult, IActorTest } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import { fetch, Agent, interceptors, cacheStores } from 'undici';

// eslint-disable-next-line ts/no-require-imports
import CachePolicy = require('http-cache-semantics');

/**
 * A comunica Validate Http Actor.
 */
export class ActorHttpValidate extends ActorHttp {
  private readonly mediatorHttp: MediatorHttp;

  public constructor(args: IActorHttpValidateArgs) {
    super(args);
    this.mediatorHttp = args.mediatorHttp;
  }

  public async test(action: ActionHttp): Promise<TestResult<IActorTest>> {
    // TODO: check if policyCache is present
    if (action.type !== 'validation') { // TODO: we should always work, not just for validation reqs!!!
      return failTest(`${this.name} can only handle validation request`);
    }
    return passTest({ time: Number.POSITIVE_INFINITY });
  }

  public async run(action: ActionHttp): Promise<ActorHttpOutput> {
    const url = typeof action.input === 'string' ? action.input : action.input.url;
    const policyCache: Record<string, CachePolicy> = <any> {}; // TODO
    // TODO: how does this relate to undici's caching? can the same as this be achieved with that?
    // TODO: do we even need this policyCache? maybe we can just return the policy, and let the user handle caching if needed?
    // TODO: don't enable this actor by default?
    // TODO: impl test rdf-store cache actor on dereference bus?

    if (action.type === 'validation' && policyCache[url]) {
      const request = new Request(action.input, action.init);

      // Immediately return if our request's response is still valid.
      if (action.validate.satisfiesWithoutRevalidation(request)) {
        return {
          type: 'validation',
          validated: true,
          requested: false,
        };
      }

      const headers = new Headers(action.init?.headers);
      for (const [ key, values ] of Object.entries(action.validate.revalidationHeaders(request))) {
        for (const value of values ?? []) {
          headers.append(key, value);
        }
      }
      const { response } = await this.mediatorHttp.mediate({
        type: 'request',
        input: new Request(action.input, {
          ...action.init,
          headers,
        }),
        context: action.context,
      });

      const { policy, modified } = action.validate.revalidatedPolicy(request, response);

      policyCache[url] = policy;

      if (!modified) {
        return {
          type: 'validation',
          validated: true,
          requested: true,
        };
      }
      return {
        type: 'validation',
        validated: false,
        requested: true,
        modifiedResponse: response,
      };
    }

    const output = await this.mediatorHttp.mediate({
      type: 'request',
      input: action.input,
      init: action.init,
      context: action.context, // TODO: delete policy cache to avoid inf recursion
    });

    // For new request make a policy and put it in cache.
    if (policyCache) {
      const policy = new CachePolicy(
        new Request(action.input, action.init),
        output.response,
      );
      if (policy.storable()) {
        policyCache[url] = policy; // TODO: handle ttl? policy.timeToLive()
      }
    }

    return output;
  }
}

export interface IActorHttpValidateArgs extends IActorHttpArgs {
  /**
   * The HTTP mediator.
   */
  mediatorHttp: MediatorHttp;
}
