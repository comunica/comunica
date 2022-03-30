import type {
  IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput, MediatorRdfResolveQuadPattern,
} from '@comunica/bus-rdf-resolve-quad-pattern';
import type { IActorArgs, IActorTest } from '@comunica/core';
import { Actor } from '@comunica/core';

/**
 * A comunica actor for rdf-resolve-quad-pattern-intercept events.
 *
 * Actor types:
 * * Input:  IActionRdfResolveQuadPatternIntercept:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorRdfResolveQuadPatternInterceptOutput: TODO: fill in.
 *
 * @see IActionRdfResolveQuadPatternIntercept
 * @see IActorRdfResolveQuadPatternInterceptOutput
 */
export abstract class ActorRdfResolveQuadPatternIntercept extends
  Actor<IActionRdfResolveQuadPatternIntercept, IActorTest, IActorRdfResolveQuadPatternInterceptOutput> {
  public readonly mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;

  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorRdfResolveQuadPatternInterceptArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPatternIntercept): Promise<IActorTest> {
    return true;
  }

  public abstract runIntercept(action: IActionRdfResolveQuadPatternIntercept):
  Promise<IActionRdfResolveQuadPatternIntercept>;

  public async run(action: IActionRdfResolveQuadPatternIntercept): Promise<IActorRdfResolveQuadPatternInterceptOutput> {
    return this.mediatorRdfResolveQuadPattern.mediate(await this.runIntercept(action));
  }
}

export interface IActorRdfResolveQuadPatternInterceptArgs extends
  IActorArgs<IActionRdfResolveQuadPatternIntercept, IActorTest, IActorRdfResolveQuadPatternInterceptOutput> {
  mediatorRdfResolveQuadPattern: MediatorRdfResolveQuadPattern;
}

export type IActionRdfResolveQuadPatternIntercept = IActionRdfResolveQuadPattern;
export type IActorRdfResolveQuadPatternInterceptOutput = IActorRdfResolveQuadPatternOutput;
export type MediatorRdfResolveQuadPatternIntercept = MediatorRdfResolveQuadPattern;
