import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import type { IActionRdfResolveHypermedia,
  IActorRdfResolveHypermediaOutput,
  IActorRdfResolveHypermediaTest, IActorRdfResolveHypermediaArgs } from '@comunica/bus-rdf-resolve-hypermedia';
import { ActorRdfResolveHypermedia } from '@comunica/bus-rdf-resolve-hypermedia';
import type { IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { RdfSourceQpf } from './RdfSourceQpf';

/**
 * A comunica QPF RDF Resolve Quad Pattern Actor.
 */
export class ActorRdfResolveHypermediaQpf extends ActorRdfResolveHypermedia
  implements IActorRdfResolveHypermediaQpfArgs {
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;

  public constructor(args: IActorRdfResolveHypermediaQpfArgs) {
    super(args, 'qpf');
  }

  public async testMetadata(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaTest> {
    const { searchForm } = this.createSource(action.url, action.metadata, action.context);
    if (action.handledDatasets && action.handledDatasets[searchForm.dataset]) {
      throw new Error(`Actor ${this.name} can only be applied for the first page of a QPF dataset.`);
    }
    return { filterFactor: 1 };
  }

  /**
   * Look for the search form
   * @param {IActionRdfResolveHypermedia} action the metadata to look for the form.
   * @return {Promise<IActorRdfResolveHypermediaOutput>} A promise resolving to a hypermedia form.
   */
  public async run(action: IActionRdfResolveHypermedia): Promise<IActorRdfResolveHypermediaOutput> {
    this.logInfo(action.context, `Identified as qpf source: ${action.url}`);
    const source = this.createSource(action.url, action.metadata, action.context, action.quads);
    return { source, dataset: source.searchForm.dataset };
  }

  protected createSource(
    url: string,
    metadata: Record<string, any>,
    context: IActionContext,
    quads?: RDF.Stream,
  ): RdfSourceQpf {
    return new RdfSourceQpf(
      this.mediatorMetadata,
      this.mediatorMetadataExtract,
      this.mediatorDereferenceRdf,
      this.subjectUri,
      this.predicateUri,
      this.objectUri,
      this.graphUri,
      url,
      metadata,
      context,
      quads,
    );
  }
}

export interface IActorRdfResolveHypermediaQpfArgs extends IActorRdfResolveHypermediaArgs {
  /**
   * The metadata mediator
   */
  mediatorMetadata: MediatorRdfMetadata;
  /**
   * The metadata extract mediator
   */
  mediatorMetadataExtract: MediatorRdfMetadataExtract;
  /**
   * The RDF dereference mediator
   */
  mediatorDereferenceRdf: MediatorDereferenceRdf;
  /**
   * The URI that should be interpreted as subject URI
   * @default {http://www.w3.org/1999/02/22-rdf-syntax-ns#subject}
   */
  subjectUri: string;
  /**
   * The URI that should be interpreted as predicate URI
   * @default {http://www.w3.org/1999/02/22-rdf-syntax-ns#predicate}
   */
  predicateUri: string;
  /**
   * The URI that should be interpreted as object URI
   * @default {http://www.w3.org/1999/02/22-rdf-syntax-ns#object}
   */
  objectUri: string;
  /**
   * The URI that should be interpreted as graph URI
   * @default {http://www.w3.org/ns/sparql-service-description#graph}
   */
  graphUri?: string;
}
