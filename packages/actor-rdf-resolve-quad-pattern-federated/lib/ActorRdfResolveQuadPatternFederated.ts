import {
  ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, IDataSource, ILazyQuadSource,
} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {FederatedQuadSource} from "./FederatedQuadSource";

/**
 * A comunica Federated RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFederated extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternFederatedArgs {

  public readonly mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
  public readonly skipEmptyPatterns: boolean;

  protected readonly emptyPatterns: Map<IDataSource, RDF.Quad[]> = new Map();

  constructor(args: IActorRdfResolveQuadPatternFederatedArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    const sources = this.getContextSources(action.context);
    if (!sources) {
      throw new Error('Actor ' + this.name + ' can only resolve quad pattern queries against a sources array.');
    }
    return true;
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    return new FederatedQuadSource(this.mediatorResolveQuadPattern, context,
      this.emptyPatterns, this.skipEmptyPatterns);
  }

}

export interface IActorRdfResolveQuadPatternFederatedArgs
  extends  IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
  skipEmptyPatterns?: boolean;
}
