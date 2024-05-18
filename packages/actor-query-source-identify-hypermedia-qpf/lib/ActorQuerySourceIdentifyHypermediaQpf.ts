import { BindingsFactory } from '@comunica/bindings-factory';
import type { MediatorDereferenceRdf } from '@comunica/bus-dereference-rdf';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import {
  ActorQuerySourceIdentifyHypermedia,
} from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorRdfMetadata } from '@comunica/bus-rdf-metadata';
import type { MediatorRdfMetadataExtract } from '@comunica/bus-rdf-metadata-extract';
import { KeysInitQuery } from '@comunica/context-entries';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import type * as RDF from '@rdfjs/types';
import { Factory } from 'sparqlalgebrajs';
import { QuerySourceQpf } from './QuerySourceQpf';

/**
 * A comunica QPF Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaQpf extends ActorQuerySourceIdentifyHypermedia
  implements IActorQuerySourceIdentifyHypermediaQpfArgs {
  public readonly mediatorMetadata: MediatorRdfMetadata;
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly subjectUri: string;
  public readonly predicateUri: string;
  public readonly objectUri: string;
  public readonly graphUri?: string;
  public constructor(args: IActorQuerySourceIdentifyHypermediaQpfArgs) {
    super(args, 'qpf');
  }

  public override async test(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<IActorQuerySourceIdentifyHypermediaTest> {
    if (action.forceSourceType && (action.forceSourceType !== 'qpf' && action.forceSourceType !== 'brtpf')) {
      throw new Error(`Actor ${this.name} is not able to handle source type ${action.forceSourceType}.`);
    }
    return this.testMetadata(action);
  }

  public async testMetadata(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<IActorQuerySourceIdentifyHypermediaTest> {
    const { searchForm } = await this.createSource(
      action.url,
      action.metadata,
      action.context,
      action.forceSourceType === 'brtpf',
    );
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
  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    this.logInfo(action.context, `Identified as qpf source: ${action.url}`);
    const source = await this.createSource(
      action.url,
      action.metadata,
      action.context,
      action.forceSourceType === 'brtpf',
      action.quads,
    );
    return { source, dataset: source.searchForm.dataset };
  }

  protected async createSource(
    url: string,
    metadata: Record<string, any>,
    context: IActionContext,
    bindingsRestricted: boolean,
    quads?: RDF.Stream,
  ): Promise<QuerySourceQpf> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new Factory(dataFactory);
    return new QuerySourceQpf(
      this.mediatorMetadata,
      this.mediatorMetadataExtract,
      this.mediatorDereferenceRdf,
      dataFactory,
      algebraFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, context, dataFactory),
      this.subjectUri,
      this.predicateUri,
      this.objectUri,
      this.graphUri,
      url,
      metadata,
      bindingsRestricted,
      quads,
    );
  }
}

export interface IActorQuerySourceIdentifyHypermediaQpfArgs extends IActorQuerySourceIdentifyHypermediaArgs {
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
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
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
