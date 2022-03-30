import type { MediatorDereferenceRule } from '@comunica/bus-dereference-rule';
import type { ActorHttpInvalidateListenable, IActionHttpInvalidate } from '@comunica/bus-http-invalidate';
import type { IActionRuleResolve, IActorRuleResolveArgs, IRuleSource } from '@comunica/bus-rule-resolve';
import { ActorRuleResolveSource } from '@comunica/bus-rule-resolve';
import type { IActorTest } from '@comunica/core';
import { KeysRdfReason } from '@comunica/reasoning-context-entries';
import type { IActionContext } from '@comunica/types';
import LRUCache = require('lru-cache');
import { MediatedRuleSource } from './MediatedRuleSource';

/**
 * A comunica Hypermedia Rule Resolve Actor.
 */
export class ActorRuleResolveHypermedia extends ActorRuleResolveSource
  implements IActorRuleResolveHypermediaArgs {
  public readonly mediatorDereferenceRule: MediatorDereferenceRule;
  public readonly httpInvalidator: ActorHttpInvalidateListenable;
  public readonly cacheSize: number;
  public readonly cache?: LRUCache<string, MediatedRuleSource>;

  public constructor(args: IActorRuleResolveHypermediaArgs) {
    super(args);
    const cache = this.cache = this.cacheSize ?
      new LRUCache<string, MediatedRuleSource>({ max: this.cacheSize }) :
      undefined;
    if (cache) {
      this.httpInvalidator.addInvalidateListener(
        ({ url }: IActionHttpInvalidate) => url ? cache.del(url) : cache.reset(),
      );
    }
  }

  public async test(action: IActionRuleResolve): Promise<IActorTest> {
    // TODO: Add something like this back in when we have multiple sources
    // const sources = hasContextSingleSource(action.context);
    // if (!sources) {
    //   throw new Error(`Actor ${this.name} can only resolve quad pattern queries against a single source.`);
    // }
    return true;
  }

  protected getSource(context: IActionContext): IRuleSource {
    const url = context.get<string>(KeysRdfReason.rules);

    if (!url) {
      throw new Error('No rule found in context');
    }

    let source = this.cache?.get(url);

    if (!source) {
      // If not in cache, create a new source
      source = new MediatedRuleSource(context, url, this);
      // Set in cache
      this.cache?.set(url, source);
    }

    return source;
  }
}

export interface IActorRuleResolveHypermediaArgs extends IActorRuleResolveArgs {
  /**
   * The maximum number of entries in the LRU cache, set to 0 to disable.
   * @range {integer}
   * @default {100}
   */
  cacheSize: number;
  /* eslint-disable max-len */
  /**
   * An actor that listens to HTTP invalidation events
   * @default {<default_invalidator> a <npmd:@comunica/bus-http-invalidate/^2.0.0/components/ActorHttpInvalidateListenable.jsonld#ActorHttpInvalidateListenable>}
   */
  httpInvalidator: ActorHttpInvalidateListenable;
  /* eslint-enable max-len */
  mediatorDereferenceRule: MediatorDereferenceRule;
}
