import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import { ActorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import type { MediatorTermComparatorFactory } from '@comunica/bus-term-comparator-factory';
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
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorTermComparatorFactory: MediatorTermComparatorFactory;

  public constructor(args: IActorQuerySourceIdentifyHypermediaNoneArgs) {
    super(args, 'file');
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.mediatorTermComparatorFactory = args.mediatorTermComparatorFactory;
  }

  public async testMetadata(
    _action: IActionQuerySourceIdentifyHypermedia,
  ): Promise<TestResult<IActorQuerySourceIdentifyHypermediaTest>> {
    return passTest({ filterFactor: 0 });
  }

  public async run(action: IActionQuerySourceIdentifyHypermedia): Promise<IActorQuerySourceIdentifyHypermediaOutput> {
    this.logInfo(action.context, `Identified as file source: ${action.url}`);
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const store = await ActorQuerySourceIdentifyHypermediaNone.storeStream(action.quads);

    // PROTOTYPE: order the indexes by the same comparator that consumers compare with, so that scans
    // of this store report the order they produce and can be asked to skip ahead within it.
    if (process.env.COMUNICA_SORTED_STORE === '1' && process.env.COMUNICA_STORE_SORT !== '0') {
      const termComparator = await this.mediatorTermComparatorFactory.mediate({ context: action.context });
      (<any> store).sortIndexes((termA: RDF.Term, termB: RDF.Term) => termComparator.orderTypes(termA, termB));
    }

    const source = new QuerySourceRdfJs(
      store,
      dataFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
    );
    source.toString = () => `QuerySourceRdfJs(${action.url})`;
    source.referenceValue = action.url;
    return { source };
  }

  /**
   * PROTOTYPE: the index set to build, so that the cost of the extra index and of where it sits can be
   * measured apart from the cost of ordering.
   */
  public static indexCombinations(): any[] {
    const gspo = [ 'graph', 'subject', 'predicate', 'object' ];
    const gpso = [ 'graph', 'predicate', 'subject', 'object' ];
    const gosp = [ 'graph', 'object', 'subject', 'predicate' ];
    const gpos = [ 'graph', 'predicate', 'object', 'subject' ];
    switch (process.env.COMUNICA_STORE_INDEXES) {
      case '3':
        return [ gspo, gpos, gosp ];
      case '4gpos':
        return [ gspo, gpos, gosp, gpso ];
      default:
        return [ gspo, gpso, gosp, gpos ];
    }
  }

  public static storeStream<Q extends RDF.BaseQuad = RDF.Quad>(stream: RDF.Stream<Q>): Promise<RDF.Store<Q>> {
    // PROTOTYPE: with COMUNICA_SORTED_STORE, index on (graph, predicate, subject, object) as well, so
    // that a bound-predicate scan is answered by an index that walks subjects and therefore comes back
    // in subject order. GPOS is kept after it, for predicate-and-object-bound patterns.
    const store: RDF.Store<Q> = process.env.COMUNICA_SORTED_STORE === '1' ?
      <RDF.Store<Q>> <any> new RdfStore<any, any>({
        ...RdfStore.createDefault(true).options,
        indexCombinations: ActorQuerySourceIdentifyHypermediaNone.indexCombinations(),
      }) :
      <RDF.Store<Q>> <RDF.Store> RdfStore.createDefault(true);
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
  /**
   * A mediator for creating term comparators
   */
  mediatorTermComparatorFactory: MediatorTermComparatorFactory;
}
