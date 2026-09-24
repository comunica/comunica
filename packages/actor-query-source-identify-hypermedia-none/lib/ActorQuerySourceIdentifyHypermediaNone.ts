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
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type {
  ComunicaDataFactory,
  DereferenceFromNamedConflictMode,
  DereferenceFromNamedConflictModeResolver,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import type { QuadTermName } from 'rdf-terms';

/**
 * A comunica None Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaNone extends ActorQuerySourceIdentifyHypermedia {
  /**
   * The indexes of an ordered store.
   * GPSO comes first, so that it serves `?s <p> ?o`, which then comes back in subject order: star-shaped
   * joins on the subject can merge such scans. It also serves subject-only patterns, by skipping from one
   * predicate to the next, which is why it replaces GSPO rather than being added to it.
   */
  public static readonly ORDERED_INDEX_COMBINATIONS: QuadTermName[][] = [
    [ 'graph', 'predicate', 'subject', 'object' ],
    [ 'graph', 'predicate', 'object', 'subject' ],
    [ 'graph', 'object', 'subject', 'predicate' ],
  ];

  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  public readonly mediatorTermComparatorFactory?: MediatorTermComparatorFactory;

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
    const namedGraph = action.context.get(KeysQueryOperation.sourceAsNamedGraph);
    const resolveConflictMode = action.context.get(KeysInitQuery.dereferenceFromNamedConflictMode) ??
      ((): DereferenceFromNamedConflictMode => 'error');

    // A file is loaded in full before it is queried, which is what an ordered store is built for.
    // It keeps quads sorted on the same term order that consumers compare with, so that its scans can
    // report that order and skip ahead within it.
    let termComparator: ((termA: RDF.Term, termB: RDF.Term) => number) | undefined;
    if (this.mediatorTermComparatorFactory) {
      const comparator = await this.mediatorTermComparatorFactory.mediate({ context: action.context });
      termComparator = (termA, termB) => comparator.orderTypes(termA, termB);
    }

    const source = new QuerySourceRdfJs(
      await ActorQuerySourceIdentifyHypermediaNone.storeStream(
        action.quads,
        namedGraph ? { dataFactory, graph: namedGraph, url: action.url, resolveConflictMode } : undefined,
        termComparator,
      ),
      dataFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
    );
    source.toString = () => `QuerySourceRdfJs(${action.url})`;
    source.referenceValue = action.url;
    return { source };
  }

  /**
   * Create the store that a file is loaded into.
   * @param termComparator If given, the order of an ordered store to create, instead of a default store.
   */
  public static createStore<Q extends RDF.BaseQuad = RDF.Quad>(
    termComparator?: (termA: RDF.Term, termB: RDF.Term) => number,
  ): RdfStore<any, Q> {
    if (termComparator) {
      return <RdfStore<any, Q>><unknown> RdfStore.createOrdered({
        termComparator,
        indexCombinations: ActorQuerySourceIdentifyHypermediaNone.ORDERED_INDEX_COMBINATIONS,
        nodes: true,
      });
    }
    return <RdfStore<any, Q>><unknown> RdfStore.createDefault(true);
  }

  public static storeStream<Q extends RDF.BaseQuad = RDF.Quad>(
    stream: RDF.Stream<Q>,
    rewrite?: {
      dataFactory: ComunicaDataFactory;
      graph: RDF.NamedNode;
      url: string;
      resolveConflictMode: DereferenceFromNamedConflictModeResolver;
    },
    termComparator?: (termA: RDF.Term, termB: RDF.Term) => number,
  ): Promise<RDF.Store<Q>> {
    const store = ActorQuerySourceIdentifyHypermediaNone.createStore<Q>(termComparator);

    if (!rewrite) {
      return new Promise((resolve, reject) => store.import(stream)
        .on('error', reject)
        .once('end', () => resolve(store)));
    }

    // An ordered store inserts a batch much faster than quads one by one, so those are collected first.
    const batch: Q[] | undefined = termComparator ? [] : undefined;
    const addQuad = (quad: Q): void => {
      if (batch) {
        batch.push(quad);
      } else {
        store.addQuad(quad);
      }
    };

    return new Promise((resolve, reject) => {
      stream
        .on('error', reject)
        .on('data', (rawQuad: Q) => {
          const quad = <RDF.Quad><unknown> rawQuad;
          // Quads that the source already exposes under a named graph of its own conflict with the
          // graph this FROM NAMED source must be exposed under, so the conflict mode decides their fate.
          if (quad.graph.termType !== 'DefaultGraph') {
            const conflictMode = rewrite.resolveConflictMode(quad);
            if (conflictMode === 'error') {
              reject(new Error(
                `Detected an existing named graph '${quad.graph.value}' while loading ${rewrite.url} as a FROM ` +
                `NAMED source. Refusing to overwrite it with <${rewrite.graph.value}>, as that would lose data. ` +
                `Set the 'dereferenceFromNamedConflictMode' context entry to a resolver returning ` +
                `'preferNamed' or 'keepSource' to allow this.`,
              ));
              return;
            }
            if (conflictMode === 'keepSource') {
              addQuad(rawQuad);
              return;
            }
          }

          addQuad(<Q><unknown> rewrite.dataFactory.quad(
            quad.subject,
            quad.predicate,
            quad.object,
            rewrite.graph,
          ));
        })
        .on('end', () => {
          if (batch) {
            store.addQuads(batch);
          }
          resolve(store);
        });
    });
  }
}

export interface IActorQuerySourceIdentifyHypermediaNoneArgs extends IActorQuerySourceIdentifyHypermediaArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  /**
   * A mediator for creating term comparators.
   * If set, files are loaded into a store that keeps its quads in the order of these comparators,
   * so that scans of it can report that order and skip ahead within it, which merge joins make use of.
   * If not set, files are loaded into a default store, whose scans have no order.
   */
  mediatorTermComparatorFactory?: MediatorTermComparatorFactory;
}
