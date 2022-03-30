import type { MediatorRdfReason } from '@comunica/bus-rdf-reason';
import { getContextWithImplicitDataset, setUnionSource } from '@comunica/bus-rdf-reason';
import type {
  IActionRdfResolveQuadPatternIntercept, IActorRdfResolveQuadPatternInterceptArgs,
} from '@comunica/bus-rdf-resolve-quad-pattern-intercept';
import { ActorRdfResolveQuadPatternIntercept } from '@comunica/bus-rdf-resolve-quad-pattern-intercept';

/**
 * A comunica Reasoned RDF Resolve Quad Pattern Intercept Actor.
 */
export class ActorRdfResolveQuadPatternInterceptReasoned extends ActorRdfResolveQuadPatternIntercept {
  public readonly mediatorRdfReason: MediatorRdfReason;

  public constructor(args: IActorRdfResolveQuadPatternInterceptReasonedArgs) {
    super(args);
  }

  public async runIntercept(action: IActionRdfResolveQuadPatternIntercept):
  Promise<IActionRdfResolveQuadPatternIntercept> {
    const context = getContextWithImplicitDataset(action.context);
    // TODO: Work out how to emit results from other sources while still reasoning
    // this will be done by including the
    const { execute } = await this.mediatorRdfReason.mediate({ context, pattern: action.pattern });
    // TODO: Put this in a lock
    await execute();
    return { ...action, context: setUnionSource(context) };
  }
}

interface IActorRdfResolveQuadPatternInterceptReasonedArgs extends IActorRdfResolveQuadPatternInterceptArgs {
  mediatorRdfReason: MediatorRdfReason;
}

