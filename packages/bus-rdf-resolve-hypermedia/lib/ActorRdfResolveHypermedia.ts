import {Actor, IAction, IActorArgs, IActorOutput, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";

/**
 * A comunica actor for rdf-resolve-hypermedia bus.
 *
 * Actor types:
 * * Input:  IActionRdfResolveHypermedia:      The metadata in the document and a query operation.
 * * Test:   <none>
 * * Output: IActorRdfResolveHypermediaOutput: An RDF source.
 *
 * @see IActionRdfResolveQuadPattern
 * @see IActorRdfResolveQuadPatternOutput
 */
export abstract class ActorRdfResolveHypermedia extends Actor<IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaOutput> {

  protected readonly sourceType: string;

  constructor(args: IActorArgs<IActionRdfResolveHypermedia, IActorRdfResolveHypermediaTest,
    IActorRdfResolveHypermediaOutput>,
              sourceType: string) {
    super(args);
    this.sourceType = sourceType;
  }

  public async test(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    if (action.forceSourceType && this.sourceType !== action.forceSourceType) {
      throw new Error(`Actor ${this.name} is not able to handle source type ${action.forceSourceType}.`);
    }
    return this.testMetadata(action);
  }

  public abstract testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest>;

}

export interface IActionRdfResolveHypermedia extends IAction {
  /**
   * The URL of the source that was fetched.
   */
  url: string;
  /**
   * A metadata key-value mapping.
   */
  metadata: {[id: string]: any};
  /**
   * A stream of data quads.
   */
  quads: RDF.Stream;
  /**
   * A hash of all datasets that have been handled.
   */
  handledDatasets?: {[type: string]: boolean};
  /**
   * The explicitly requested source type.
   * If set, the source type of the actor MUST explicitly match the given forced type.
   */
  forceSourceType?: string;
}

export interface IActorRdfResolveHypermediaTest extends IActorTest {
  /**
   * A value from 0 to 1 indicating to what respect a source type is
   * able to pre-filter the source based on the pattern.
   * 1 indicates that the source can apply the whole pattern,
   * and 0 indicates that the source can not apply the pattern at all (and local filtering must happen).
   */
  filterFactor: number;
}

export interface IActorRdfResolveHypermediaOutput extends IActorOutput {
  /**
   * The new source of quads contained in the document.
   *
   * Optionally, these sources can emit a 'metadata' event with a metadata object
   * that will should override the metadata of this source.
   */
  source: RDF.Source;
  /**
   * The dataset that was handled.
   */
  dataset?: string;
}
