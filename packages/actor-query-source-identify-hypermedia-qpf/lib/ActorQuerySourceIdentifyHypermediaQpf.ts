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
import type { TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext } from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { QuerySourceQpf } from './QuerySourceQpf';

/**
 * A comunica QPF Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaQpf extends ActorQuerySourceIdentifyHypermedia
  implements IActorQuerySourceIdentifyHypermediaQpfArgs {
  /**
   * The mediator for splitting metadata from data streams.
   */
  public readonly mediatorMetadata: MediatorRdfMetadata;
  /**
   * The mediator for extracting metadata from RDF streams.
   */
  public readonly mediatorMetadataExtract: MediatorRdfMetadataExtract;
  /**
   * The mediator for dereferencing RDF resources.
   */
  public readonly mediatorDereferenceRdf: MediatorDereferenceRdf;
  /**
   * The mediator for creating binding context merge handlers.
   */
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * The URI interpreted as the subject component in a QPF search form.
   */
  public readonly subjectUri: string;
  /**
   * The URI interpreted as the predicate component in a QPF search form.
   */
  public readonly predicateUri: string;
  /**
   * The URI interpreted as the object component in a QPF search form.
   */
  public readonly objectUri: string;
  /**
   * The URI interpreted as the graph component in a QPF search form.
   */
  public readonly graphUri?: string;

  /**
   * Creates a new QPF query source identify hypermedia actor.
   * @param args The actor arguments.
   */
  public constructor(args: IActorQuerySourceIdentifyHypermediaQpfArgs) {
    super(args, 'qpf');
    this.mediatorMetadata = args.mediatorMetadata;
    this.mediatorMetadataExtract = args.mediatorMetadataExtract;
    this.mediatorDereferenceRdf = args.mediatorDereferenceRdf;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.subjectUri = args.subjectUri;
    this.predicateUri = args.predicateUri;
    this.objectUri = args.objectUri;
    this.graphUri = args.graphUri;
  }

  /**
   * Tests whether the source type is compatible with QPF or brTPF.
   * @param action The hypermedia identification action.
   * @return A test result with filter factor or failure.
   */
  public override async test(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    if (action.forceSourceType && (action.forceSourceType !== 'qpf' && action.forceSourceType !== 'brtpf')) {
      return failTest(`Actor ${this.name} is not able to handle source type ${action.forceSourceType}.`);
    }
    return this.testMetadata(action);
  }

  /**
   * Tests whether a QPF search form exists in the metadata.
   * @param action The hypermedia identification action.
   * @return A test result with filter factor or failure.
   */
  public async testMetadata(
    action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    const { searchForm } = await this.createSource(
      action.url,
      action.metadata,
      action.context,
      action.forceSourceType === 'brtpf',
    );
    if (!searchForm) {
      return failTest('Illegal state: found no TPF/QPF search form anymore in metadata.');
    }
    if (action.handledDatasets && action.handledDatasets[searchForm.dataset]) {
      return failTest(`Actor ${this.name} can only be applied for the first page of a QPF dataset.`);
    }
    return passTest({ filterFactor: 1 });
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

  /**
   * Creates a new QuerySourceQpf from the given parameters.
   * @param url The URL of the QPF source.
   * @param metadata The metadata record containing search forms.
   * @param context The action context.
   * @param bindingsRestricted Whether bindings-restricted (brTPF) mode is enabled.
   * @param quads An optional initial quad stream.
   * @return A new QPF query source.
   */
  protected async createSource(
    url: string,
    metadata: Record<string, any>,
    context: IActionContext,
    bindingsRestricted: boolean,
    quads?: RDF.Stream,
  ): Promise<QuerySourceQpf> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
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
