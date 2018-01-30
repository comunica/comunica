import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern,
  IActorRdfResolveQuadPatternOutput, ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
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

  protected readonly emptyPatterns: {[sourceHash: string]: RDF.Quad[]} = {};

  constructor(args: IActorRdfResolveQuadPatternFederatedArgs) {
    super(args);
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!action.context || !action.context.sources || action.context.sources.length < 2) {
      throw new Error('Actor ' + this.name + ' can only resolve quad pattern queries against a set of sources.');
    }
    return true;
  }

  protected async getSource(context?: {[id: string]: any}): Promise<ILazyQuadSource> {
    return new FederatedQuadSource(this.mediatorResolveQuadPattern, context,
      this.emptyPatterns, this.skipEmptyPatterns);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: {[id: string]: any})
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach metadata to the output
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = new Promise((resolve, reject) => {
      output.data.on('error', reject);
      output.data.on('end', () => reject(new Error('No metadata was found')));
      output.data.on('metadata', (metadata) => {
        resolve(metadata);
      });
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternFederatedArgs
  extends  IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  mediatorResolveQuadPattern: Mediator<Actor<IActionRdfResolveQuadPattern, IActorTest,
    IActorRdfResolveQuadPatternOutput>, IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput>;
  skipEmptyPatterns?: boolean;
}

export interface IQuerySource {
  type: string;
  value: any;
}
