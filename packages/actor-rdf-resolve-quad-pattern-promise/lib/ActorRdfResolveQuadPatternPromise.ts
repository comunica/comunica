import {
  ActorRdfResolveQuadPattern,
  getContextSource,
  hasContextSingleSourceOfType,
  isDataSourceRawType,
  type IActionRdfResolveQuadPattern,
  type IActorRdfResolveQuadPatternArgs,
  type IActorRdfResolveQuadPatternOutput,
  type MediatorRdfResolveQuadPattern,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import { KeysRdfResolveQuadPattern } from '@comunica/context-entries';
import type { IActorTest } from '@comunica/core';

/**
 * A comunica RDF Resolve Quad Pattern Actor for source wrapped in a promise
 */
export class ActorRdfResolveQuadPatternPromise extends ActorRdfResolveQuadPattern {
  private readonly mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;

  public constructor(args: IActorRdfResolveQuadPatternPromiseArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!hasContextSingleSourceOfType('promise', action.context)) {
      throw new Error(`${this.name} requires a single source as a promise to be present in the context.`);
    }
    return true;
  }

  public async run(action: IActionRdfResolveQuadPattern): Promise<IActorRdfResolveQuadPatternOutput> {
    let source = await getContextSource(action.context);

    if (source && !isDataSourceRawType(source) && source.type === 'promise') {
      source = await source.value;
    }

    return this.mediatorResolveQuadPattern.mediate({
      ...action,
      context: action.context.set(KeysRdfResolveQuadPattern.source, source),
    });
  }
}

export interface IActorRdfResolveQuadPatternPromiseArgs extends IActorRdfResolveQuadPatternArgs {
  mediatorResolveQuadPattern: MediatorRdfResolveQuadPattern;
}
