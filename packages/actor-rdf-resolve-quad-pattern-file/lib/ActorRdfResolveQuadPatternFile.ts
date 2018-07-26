import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import {N3Store, Store} from "n3";
import * as RDF from "rdf-js";
import {N3StoreIterator} from "./N3StoreIterator";
import {N3StoreQuadSource} from "./N3StoreQuadSource";

/**
 * A comunica File RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFile extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternFileArgs {

  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly files?: string[];
  public stores: {[file: string]: Promise<N3Store>} = {};

  constructor(args: IActorRdfResolveQuadPatternFileArgs) {
    super(args);
  }

  public initializeFile(file: string, context: ActionContext): Promise<any> {
    return this.stores[file] = this.mediatorRdfDereference.mediate({ context, url: file })
      .then((page: IActorRdfDereferenceOutput) => new Promise<N3Store>((resolve, reject) => {
        const store: N3Store = new Store();
        page.quads.on('data', (quad) => store.addQuad(quad));
        page.quads.on('error', reject);
        page.quads.on('end', () => resolve(store));
      }));
  }

  public async initialize(): Promise<any> {
    (this.files || []).forEach((file) => this.initializeFile(file, null));
    return null;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSource('file', action.context)) {
      throw new Error(this.name + ' requires a single source with a file to be present in the context.');
    }
    return true;
  }

  protected async getSource(context: ActionContext): Promise<ILazyQuadSource> {
    const file: string = this.getContextSource(context).value;
    if (!this.stores[file]) {
      await this.initializeFile(file, context);
    }
    return new N3StoreQuadSource(await this.stores[file]);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = () => new Promise((resolve, reject) => {
      const file: string = this.getContextSource(context).value;
      this.stores[file].then((store) => {
        const totalItems: number = store.countQuads(
          N3StoreIterator.nullifyVariables(pattern.subject),
          N3StoreIterator.nullifyVariables(pattern.predicate),
          N3StoreIterator.nullifyVariables(pattern.object),
          N3StoreIterator.nullifyVariables(pattern.graph),
        );
        resolve({ totalItems });
      }, reject);
    });
    return output;
  }

}

export interface IActorRdfResolveQuadPatternFileArgs
  extends IActorArgs<IActionRdfResolveQuadPattern, IActorTest, IActorRdfResolveQuadPatternOutput> {
  /**
   * The mediator to use for dereferencing files.
   */
  mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  /**
   * The files to preload.
   */
  files?: string[];
}
