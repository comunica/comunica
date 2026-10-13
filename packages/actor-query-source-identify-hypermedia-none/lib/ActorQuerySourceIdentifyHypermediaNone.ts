import { QuerySourceRdfJs } from '@comunica/actor-query-source-identify-rdfjs';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionQuerySourceIdentifyHypermedia,
  IActorQuerySourceIdentifyHypermediaOutput,
  IActorQuerySourceIdentifyHypermediaArgs,
  IActorQuerySourceIdentifyHypermediaTest,
} from '@comunica/bus-query-source-identify-hypermedia';
import { ActorQuerySourceIdentifyHypermedia } from '@comunica/bus-query-source-identify-hypermedia';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { TestResult } from '@comunica/core';
import { passTest } from '@comunica/core';
import type {
  ComunicaDataFactory,
  DereferenceFromNamedConflictMode,
  DereferenceFromNamedConflictModeResolver,
} from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { compareTerms } from '@comunica/utils-iterator';
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
  public readonly orderedStore: boolean;

  public constructor(args: IActorQuerySourceIdentifyHypermediaNoneArgs) {
    super(args, 'file');
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
    this.orderedStore = args.orderedStore ?? false;
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

    const source = new QuerySourceRdfJs(
      await ActorQuerySourceIdentifyHypermediaNone.storeStream(
        action.quads,
        namedGraph ? { dataFactory, graph: namedGraph, url: action.url, resolveConflictMode } : undefined,
        this.orderedStore,
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
   * @param ordered If an ordered store must be created instead of a default store.
   *                Its quads are kept in the term order, which its scans report as `termOrder`.
   */
  public static createStore<Q extends RDF.BaseQuad = RDF.Quad>(ordered: boolean): RdfStore<any, Q> {
    if (ordered) {
      return <RdfStore<any, Q>><unknown> RdfStore.createOrdered({
        termComparator: compareTerms,
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
    ordered = false,
  ): Promise<RDF.Store<Q>> {
    const store = ActorQuerySourceIdentifyHypermediaNone.createStore<Q>(ordered);

    if (!rewrite) {
      return new Promise((resolve, reject) => store.import(stream)
        .on('error', reject)
        .once('end', () => resolve(store)));
    }

    // An ordered store inserts a batch much faster than quads one by one, so those are collected first.
    const batch: Q[] | undefined = ordered ? [] : undefined;
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
   * If files must be loaded into an ordered store, which keeps its quads in the term order,
   * so that scans of it can report that order as `termOrder` and skip ahead within it, which merge joins make use of.
   * A file is loaded in full before it is queried, which is what an ordered store is built for.
   * If false, files are loaded into a default store, whose scans have no order.
   * @default {false}
   */
  orderedStore?: boolean;
}
