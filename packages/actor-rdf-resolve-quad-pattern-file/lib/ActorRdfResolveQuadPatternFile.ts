import {IActionRdfDereference, IActorRdfDereferenceOutput} from "@comunica/bus-rdf-dereference";
import {ActorRdfResolveQuadPatternSource, IActionRdfResolveQuadPattern, IActorRdfResolveQuadPatternOutput,
  ILazyQuadSource} from "@comunica/bus-rdf-resolve-quad-pattern";
import {ActionContext, Actor, IActorArgs, IActorTest, Mediator} from "@comunica/core";
import * as RDF from "rdf-js";
import {quadToStringQuad} from "rdf-string";
import {N3StoreIterator} from "./N3StoreIterator";
import {N3StoreQuadSource} from "./N3StoreQuadSource";
// TODO: Remove when N3 typings are updated
const N3Store = require('n3').Store; // tslint:disable-line:no-var-requires

/**
 * A comunica File RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveQuadPatternFile extends ActorRdfResolveQuadPatternSource
  implements IActorRdfResolveQuadPatternFileArgs {

  public readonly mediatorRdfDereference: Mediator<Actor<IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>,
    IActionRdfDereference, IActorTest, IActorRdfDereferenceOutput>;
  public readonly files?: string[];
  public stores: {[file: string]: Promise<any>} = {};

  constructor(args: IActorRdfResolveQuadPatternFileArgs) {
    super(args);
  }

  public initializeFile(file: string): Promise<any> {
    return this.stores[file] = this.mediatorRdfDereference.mediate({ url: file })
      .then((page: IActorRdfDereferenceOutput) => new Promise((resolve, reject) => {
        const store: any = new N3Store();
        page.quads.on('data', (quad) => store.addTriple(quadToStringQuad(quad)));
        page.quads.on('error', reject);
        page.quads.on('end', () => resolve(store));
      }));
  }

  public async initialize(): Promise<any> {
    (this.files || []).forEach((file) => this.initializeFile(file));
    return null;
  }

  public async test(action: IActionRdfResolveQuadPattern): Promise<IActorTest> {
    if (!this.hasContextSingleSource('file', action.context)) {
      throw new Error(this.name + ' requires a single source with a file to be present in the context.');
    }
    return true;
  }

  protected async getSource(context?: ActionContext): Promise<ILazyQuadSource> {
    const file: string = this.getContextSources(context)[0].value;
    if (!this.stores[file]) {
      await this.initializeFile(file);
    }
    return new N3StoreQuadSource(await this.stores[file]);
  }

  protected async getOutput(source: RDF.Source, pattern: RDF.Quad, context?: ActionContext)
  : Promise<IActorRdfResolveQuadPatternOutput> {
    // Attach totalItems to the output
    const output: IActorRdfResolveQuadPatternOutput = await super.getOutput(source, pattern, context);
    output.metadata = () => new Promise((resolve, reject) => {
      const file: string = this.getContextSources(context)[0].value;
      this.stores[file].then((store) => {
        const totalItems: number = store.countTriplesByIRI(
          N3StoreIterator.termToString(pattern.subject),
          N3StoreIterator.termToString(pattern.predicate),
          N3StoreIterator.termToString(pattern.object),
          N3StoreIterator.termToString(pattern.graph),
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
