import type {
  IActionHttp,
  IActorHttpOutput,
  IActorHttpArgs,
} from '@comunica/bus-http';
import { ActorHttp } from '@comunica/bus-http';
import { KeysHttp } from '@comunica/context-entries';
import { Cache } from '@comunica/http-cache-lru';
import type { IMediatorTypeTime } from '@comunica/mediatortype-time';

/**
 * A comunica Cache Http Actor.
 */
export class ActorHttpCache extends ActorHttp {
  private readonly cache: Cache;

  public constructor(args: IActorHttpArgs) {
    super(args);
    this.cache = new Cache();
  }

  public async test(action: IActionHttp): Promise<IMediatorTypeTime> {
    console.log('In Here');
    if (this.cache.has(new Request(action.input, action.init))) {
      console.log(3);
      return { time: 1 };
    }
    return { time: Number.POSITIVE_INFINITY };
  }

  public async run(action: IActionHttp): Promise<IActorHttpOutput> {
    console.log('In here 2');
    console.time('a');
    const customFetch: ((
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>) | undefined = action.context?.get(KeysHttp.fetch);
    if (customFetch) {
      this.cache.setFetch(customFetch);
    }
    const response = await this.cache.match(new Request(action.input, action.init));
    // The response should never be undefined. The typings say "undefined" is a
    // possibility because the cache implements the Cache interface, but does
    // not follow the spec.
    if (!response) {
      throw new Error('Cache fetch returned false, but should not have');
    }
    console.timeEnd('a');
    return response;
  }
}
