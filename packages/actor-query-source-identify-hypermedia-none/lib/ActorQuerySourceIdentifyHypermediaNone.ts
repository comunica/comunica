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
import type { ComunicaDataFactory, DereferenceFromNamedConflictMode } from '@comunica/types';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import type * as RDF from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';

/**
 * A comunica None Query Source Identify Hypermedia Actor.
 */
export class ActorQuerySourceIdentifyHypermediaNone extends ActorQuerySourceIdentifyHypermedia {
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;

  public constructor(args: IActorQuerySourceIdentifyHypermediaNoneArgs) {
    super(args, 'file');
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
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
    const conflictMode = action.context.get(KeysQueryOperation.dereferenceFromNamedConflictMode) ?? 'error';
    const source = new QuerySourceRdfJs(
      await ActorQuerySourceIdentifyHypermediaNone.storeStream(
        action.quads,
        namedGraph ? { dataFactory, graph: namedGraph, url: action.url, conflictMode } : undefined,
      ),
      dataFactory,
      await BindingsFactory.create(this.mediatorMergeBindingsContext, action.context, dataFactory),
    );
    source.toString = () => `QuerySourceRdfJs(${action.url})`;
    source.referenceValue = action.url;
    return { source };
  }

  public static async storeStream<Q extends RDF.BaseQuad = RDF.Quad>(
    stream: RDF.Stream<Q>,
    rewrite?: {
      dataFactory: ComunicaDataFactory;
      graph: RDF.NamedNode;
      url: string;
      conflictMode: DereferenceFromNamedConflictMode;
    },
  ): Promise<RDF.Store<Q>> {
    const store: RdfStore<any, Q> = <RdfStore<any, Q>><unknown>RdfStore.createDefault(true);

    if (!rewrite) {
      return new Promise((resolve, reject) => store.import(stream)
        .on('error', reject)
        .once('end', () => resolve(store)));
    }

    for await (const quad of <AsyncIterable<RDF.Quad>><unknown>stream) {
      const hasExistingNamedGraph = quad.graph.termType !== 'DefaultGraph';

      if (hasExistingNamedGraph && rewrite.conflictMode === 'error') {
        throw new Error(
          `Detected an existing named graph '${quad.graph.value}' while loading ${rewrite.url} as a FROM ` +
          `NAMED source. Refusing to overwrite it with <${rewrite.graph.value}>, as that would lose data.`,
        );
      }

      if (hasExistingNamedGraph && rewrite.conflictMode === 'merge') {
        // Keep this quad under its own existing named graph, unchanged.
        store.addQuad(<Q><unknown>quad);
        continue;
      }

      // Either the quad is already in the default graph, or conflictMode is 'overwrite'.
      const rewritten = rewrite.dataFactory.quad(
        quad.subject,
        quad.predicate,
        quad.object,
        rewrite.graph,
      );

      store.addQuad(<Q><unknown>rewritten);
    }

    return store;
  }
}

export interface IActorQuerySourceIdentifyHypermediaNoneArgs extends IActorQuerySourceIdentifyHypermediaArgs {
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
