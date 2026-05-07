import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import { ActorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';

/**
 * A comunica None Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaNone extends ActorQuerySourceIdentifyHypermedia {
  /**
   * The mediator for creating binding context merge handlers.
   */
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  /**
   * Creates a new none query source identify hypermedia actor.
   * @param args The actor arguments.
   */
  public constructor(args: IActorQuerySourceIdentifyHypermediaNoneArgs) {
    super(args, 'file');
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  /**
   * Always passes as a fallback source type with the lowest filter factor.
   * @param _action The hypermedia identification action.
   * @return A test result with filter factor 0.
   */
  public async testMetadata(
    _action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    return passTest({ filterFactor: 0 });
  }

  /**
   * Stores the quad stream into an RDF store and creates a QuerySourceRdfJs.
   * @param action The hypermedia identification action.
   * @return The identified query source output.
   */
  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    this.logInfo(action.context, `Identified as file source: ${action.url}`);
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const source = new QuerySourceRdfJs(
      await ActorQuerySourceIdentifyHypermediaNone.storeStream(action.quads),
      dataFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
    );
    source.toString = () => `QuerySourceRdfJs(${action.url})`;
    source.referenceValue = action.url;
    return { source };
  }

  /**
   * Imports a quad stream into an in-memory RDF store.
   * @param stream The RDF quad stream to import.
   * @return A promise resolving to the populated store.
   */
  public static storeStream<Q extends RDF.BaseQuad = RDF.Quad>(stream: RDF.Stream<Q>): Promise<RDF.Store<Q>> {
    const store: RDF.Store<Q> = <RDF.Store<Q>> <RDF.Store> RdfStore.createDefault(true);
    return new Promise((resolve, reject) => store.import(stream)
      .on('error', reject)
      .once('end', () => resolve(store)));
  }
}

export interface IActorQuerySourceIdentifyHypermediaNoneArgs extends IActorQuerySourceIdentifyHypermediaArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
