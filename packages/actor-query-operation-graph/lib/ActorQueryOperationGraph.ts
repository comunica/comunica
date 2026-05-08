import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
  Bindings,
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResult,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  MetadataBindings,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { assignOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';

/**
 * A comunica Graph Query Operation Actor.
 *
 * Handles GRAPH operations at execution time by implementing the evalGraph semantics
 * from the SPARQL specification. For GRAPH with a named node, pushes the IRI into
 * patterns and delegates. For GRAPH with a variable, enumerates all named graphs,
 * evaluates the inner pattern per-graph, and unions the results.
 * https://www.w3.org/TR/sparql12-query/#defn_evalGraph
 */
export class ActorQueryOperationGraph extends ActorQueryOperationTypedMediated<Algebra.Graph> {
  public readonly mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;

  public constructor(args: IActorQueryOperationGraphArgs) {
    super(args, Algebra.Types.GRAPH);
    this.mediatorRdfMetadataAccumulate = args.mediatorRdfMetadataAccumulate;
  }

  public async testOperation(_operation: Algebra.Graph, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(
    operation: Algebra.Graph,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    // For named nodes, verify graph existence first, then push down into patterns.
    // Per the SPARQL spec: if IRI is not a graph name in D,
    // eval(D(G), Graph(IRI,P)) = the empty multiset.
    if (operation.name.termType === 'NamedNode') {
      const exists = await this.graphExists(algebraFactory, dataFactory, operation.name, context);
      if (!exists) {
        return {
          type: 'bindings',
          bindingsStream: new ArrayIterator<Bindings>([], { autoStart: false }),
          metadata: () => Promise.resolve({
            state: new MetadataValidationState(),
            cardinality: { type: 'exact', value: 0 },
            variables: [],
          }),
        };
      }
      const rewritten = ActorQueryOperationGraph.pushDownGraph(algebraFactory, operation.input, operation.name);
      return this.mediatorQueryOperation.mediate({ operation: rewritten, context });
    }

    // Variable graph: per-graph evaluation per SPARQL spec
    const graphVar: RDF.Variable = operation.name;
    const explicitGraphs: RDF.NamedNode[] | undefined = context.get(KeysQueryOperation.datasetNamedGraphs);
    const graphNames = explicitGraphs ?? await this.discoverNamedGraphs(algebraFactory, dataFactory, graphVar, context);

    if (graphNames.length === 0) {
      return {
        type: 'bindings',
        bindingsStream: new ArrayIterator<Bindings>([], { autoStart: false }),
        metadata: () => Promise.resolve({
          state: new MetadataValidationState(),
          cardinality: { type: 'exact', value: 0 },
          variables: [],
        }),
      };
    }

    // Evaluate inner pattern per-graph and merge ?g binding into each result.
    // We handle bindings at the stream level to avoid issues with JOIN(VALUES)
    // breaking aggregate empty-group semantics and EXTEND conflicting with
    // already-bound variables.
    const perGraphOutputs: IQueryOperationResultBindings[] = await Promise.all(graphNames.map(async(iri) => {
      const rewritten = ActorQueryOperationGraph.pushDownGraph(algebraFactory, operation.input, iri);
      const result = getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: rewritten, context }),
      );
      const bindingsStream: BindingsStream = result.bindingsStream.map((binding: Bindings) => {
        const existing = binding.get(graphVar);
        if (existing && !existing.equals(iri)) {
          return null;
        }
        return existing ? binding : binding.set(graphVar, iri);
      }).filter((binding): binding is Bindings => binding !== null);
      return {
        type: <const>'bindings',
        bindingsStream,
        metadata: async(): Promise<MetadataBindings> => {
          const innerMeta = await result.metadata();
          const hasGraphVar = innerMeta.variables.some(v => v.variable.equals(graphVar));
          return {
            ...innerMeta,
            variables: hasGraphVar ?
              innerMeta.variables :
                [ ...innerMeta.variables, { variable: graphVar, canBeUndef: false }],
          };
        },
      };
    }));

    // Union all per-graph bindings streams
    const bindingsStream: BindingsStream = new UnionIterator(
      perGraphOutputs.map(output => output.bindingsStream),
      { autoStart: false },
    );

    const metadata: () => Promise<MetadataBindings> = () => Promise.all(
      perGraphOutputs.map(output => output.metadata()),
    ).then(subMeta => ActorQueryOperationGraph
      .unionMetadata(subMeta, context, this.mediatorRdfMetadataAccumulate));

    return { type: 'bindings', bindingsStream, metadata };
  }

  /**
   * Discover all named graphs by querying for distinct graph values across sources.
   */
  private async discoverNamedGraphs(
    algebraFactory: AlgebraFactory,
    dataFactory: ComunicaDataFactory,
    graphVar: RDF.Variable,
    context: IActionContext,
  ): Promise<RDF.NamedNode[]> {
    const sources: IQuerySourceWrapper[] = context.get(KeysQueryOperation.querySources) ?? [];
    if (sources.length === 0) {
      return [];
    }

    const s = dataFactory.variable('__graphDisc_s');
    const p = dataFactory.variable('__graphDisc_p');
    const o = dataFactory.variable('__graphDisc_o');

    // Create a source-annotated pattern for each source
    const patternOps: Algebra.Operation[] = sources.map(source =>
      assignOperationSource(
        algebraFactory.createPattern(s, p, o, graphVar),
        source,
      ));

    const graphQuery = patternOps.length === 1 ?
      patternOps[0] :
      algebraFactory.createUnion(patternOps);

    const distinctGraphsOp = algebraFactory.createDistinct(
      algebraFactory.createProject(graphQuery, [ graphVar ]),
    );

    const result = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: distinctGraphsOp, context }),
    );

    const graphNames: RDF.NamedNode[] = [];
    const bindings = await result.bindingsStream.toArray();
    for (const binding of bindings) {
      const value = binding.get(graphVar);
      if (value?.termType === 'NamedNode') {
        graphNames.push(value);
      }
    }

    return graphNames;
  }

  /**
   * Check if a specific named graph exists in the dataset.
   * Uses explicit datasetNamedGraphs if provided, otherwise queries sources.
   */
  private async graphExists(
    algebraFactory: AlgebraFactory,
    dataFactory: ComunicaDataFactory,
    graphIri: RDF.NamedNode,
    context: IActionContext,
  ): Promise<boolean> {
    // If explicit named graphs are provided, check against them
    const explicitGraphs: RDF.NamedNode[] | undefined = context.get(KeysQueryOperation.datasetNamedGraphs);
    if (explicitGraphs) {
      return explicitGraphs.some(g => g.equals(graphIri));
    }

    // Otherwise, query sources for at least one triple in the graph
    const sources: IQuerySourceWrapper[] = context.get(KeysQueryOperation.querySources) ?? [];
    if (sources.length === 0) {
      return false;
    }

    const s = dataFactory.variable('__graphExists_s');
    const p = dataFactory.variable('__graphExists_p');
    const o = dataFactory.variable('__graphExists_o');

    const patternOps: Algebra.Operation[] = sources.map(source =>
      assignOperationSource(
        algebraFactory.createPattern(s, p, o, graphIri),
        source,
      ));

    const query = patternOps.length === 1 ?
      patternOps[0] :
      algebraFactory.createUnion(patternOps);

    const result = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: query, context }),
    );

    const firstBinding = await result.bindingsStream.take(1).toArray();
    return firstBinding.length > 0;
  }

  /**
   * Push a graph term into all patterns and paths that use the default graph.
   * Does not recurse into nested GRAPH or SERVICE operations.
   */
  public static pushDownGraph(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    graph: RDF.NamedNode | RDF.Variable,
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false }),
        transform: (pattern: Algebra.Pattern) => {
          if (pattern.graph.termType === 'DefaultGraph') {
            return Object.assign(
              algebraFactory.createPattern(pattern.subject, pattern.predicate, pattern.object, graph),
              { metadata: pattern.metadata },
            );
          }
          return pattern;
        },
      },
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false }),
        transform: (path: Algebra.Path) => {
          if (path.graph.termType === 'DefaultGraph') {
            return Object.assign(
              algebraFactory.createPath(path.subject, path.predicate, path.object, graph),
              { metadata: path.metadata },
            );
          }
          return path;
        },
      },
      [Algebra.Types.GRAPH]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.SERVICE]: { preVisitor: () => ({ continue: false }) },
    });
  }

  /**
   * Takes the union of the given metadata array for bindings results.
   */
  public static async unionMetadata(
    metadatas: MetadataBindings[],
    context: IActionContext,
    mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate,
  ): Promise<MetadataBindings> {
    let accumulatedMetadata: MetadataBindings = <MetadataBindings>(await mediatorRdfMetadataAccumulate
      .mediate({ mode: 'initialize', context })).metadata;

    for (const appendingMetadata of metadatas) {
      accumulatedMetadata = <MetadataBindings>{
        ...appendingMetadata,
        ...(await mediatorRdfMetadataAccumulate
          .mediate({
            mode: 'append',
            accumulatedMetadata: <any>accumulatedMetadata,
            appendingMetadata: <any>appendingMetadata,
            context,
          })).metadata,
      };
    }

    accumulatedMetadata.state = new MetadataValidationState();

    const invalidateListener = (): void => accumulatedMetadata.state.invalidate();
    for (const metadata of metadatas) {
      metadata.state.addInvalidateListener(invalidateListener);
    }

    // Union variables: make all variables canBeUndef since different graphs may bind different vars
    const variableMap = new Map<string, RDF.Variable>();
    for (const metadata of metadatas) {
      for (const entry of metadata.variables) {
        variableMap.set(entry.variable.value, entry.variable);
      }
    }
    accumulatedMetadata.variables = [ ...variableMap.values() ].map(variable => ({
      variable,
      canBeUndef: true,
    }));

    return accumulatedMetadata;
  }
}

export interface IActorQueryOperationGraphArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
}
