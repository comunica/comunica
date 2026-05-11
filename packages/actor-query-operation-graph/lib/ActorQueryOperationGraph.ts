import { ActorQueryOperationUnion } from '@comunica/actor-query-operation-union';
import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfMetadataAccumulate } from '@comunica/bus-rdf-metadata-accumulate';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type {
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
import {
  assignOperationSource,
  getOperationSource,
  getSafeBindings,
} from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator, UnionIterator } from 'asynciterator';

/**
 * A comunica Graph Query Operation Actor.
 *
 * Handles SPARQL GRAPH operations at runtime, implementing the evalGraph semantics
 * from the SPARQL specification.
 *
 * For GRAPH with a named node:
 * - Checks if the graph exists (for pattern-less cases)
 * - Substitutes the graph IRI into contained patterns and evaluates
 *
 * For GRAPH with a variable:
 * - Enumerates all named graphs from available sources
 * - Evaluates the inner operation per-graph with the concrete IRI substituted
 * - Binds the graph variable and unions all results
 *
 * This correctly handles edge cases with MINUS, GROUP/aggregation, and VALUES
 * that the quad-substitution optimizer intentionally leaves untouched.
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

    if (operation.name.termType === 'NamedNode') {
      return this.runGraphIRI(operation, context, dataFactory, algebraFactory);
    }
    return this.runGraphVariable(operation, context, dataFactory, algebraFactory);
  }

  /**
   * Handle GRAPH <iri> { ... }.
   * If there are no patterns in the inner operation, check graph existence first.
   * Otherwise, substitute the graph IRI into patterns and evaluate.
   */
  private async runGraphIRI(
    operation: Algebra.Graph,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ): Promise<IQueryOperationResult> {
    const graphIRI = <RDF.NamedNode> operation.name;

    // If no patterns to substitute into, check graph existence first
    if (!ActorQueryOperationGraph.hasPatterns(operation.input)) {
      const exists = await this.graphExists(graphIRI, context, dataFactory, algebraFactory);
      if (!exists) {
        return ActorQueryOperationGraph.emptyBindingsResult();
      }
      // Graph exists but no patterns - evaluate inner as-is (e.g., VALUES)
      return this.mediatorQueryOperation.mediate({ operation: operation.input, context });
    }

    // Substitute the graph IRI into patterns and evaluate
    const substituted = ActorQueryOperationGraph.substituteGraphInOperation(
      algebraFactory,
      operation.input,
      graphIRI,
    );
    return this.mediatorQueryOperation.mediate({ operation: substituted, context });
  }

  /**
   * Handle GRAPH ?var { ... }.
   * Enumerates all named graphs, evaluates the inner operation per-graph
   * with the concrete IRI substituted, binds the variable, and unions results.
   */
  private async runGraphVariable(
    operation: Algebra.Graph,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ): Promise<IQueryOperationResult> {
    const graphVar = <RDF.Variable> operation.name;

    // Enumerate all named graphs
    const graphIRIs = await this.enumerateNamedGraphs(
      graphVar,
      operation.input,
      context,
      dataFactory,
      algebraFactory,
    );

    if (graphIRIs.length === 0) {
      return ActorQueryOperationGraph.emptyBindingsResult();
    }

    // For each graph IRI, evaluate the inner operation with the concrete IRI substituted
    const outputs: IQueryOperationResultBindings[] = await Promise.all(
      graphIRIs.map(async(graphIRI) => {
        let result: IQueryOperationResultBindings;

        if (ActorQueryOperationGraph.hasPatterns(operation.input)) {
          const substituted = ActorQueryOperationGraph.substituteGraphInOperation(
            algebraFactory,
            operation.input,
            graphIRI,
          );
          result = getSafeBindings(
            await this.mediatorQueryOperation.mediate({ operation: substituted, context }),
          );
        } else {
          // No patterns (e.g., VALUES) - evaluate inner as-is
          result = getSafeBindings(
            await this.mediatorQueryOperation.mediate({ operation: operation.input, context }),
          );
        }

        // Extend/join each binding with the graph variable binding
        // If the graph variable is already bound in the inner result (e.g., SELECT *),
        // we must check compatibility: only keep bindings where the existing value matches.
        const bindingsStream: BindingsStream = result.bindingsStream
          .filter((binding) => {
            const existingValue = binding.get(graphVar);
            return !existingValue || existingValue.equals(graphIRI);
          })
          .map((binding) => {
            if (!binding.get(graphVar)) {
              return binding.set(graphVar, graphIRI);
            }
            return binding;
          });

        return { ...result, bindingsStream };
      }),
    );

    // Union all results
    const bindingsStream: BindingsStream = new UnionIterator(
      outputs.map(output => output.bindingsStream),
      { autoStart: false },
    );

    const metadata: () => Promise<MetadataBindings> = () =>
      Promise.all(outputs.map(output => output.metadata()))
        .then(subMeta => ActorQueryOperationUnion.unionMetadata(
          subMeta,
          true,
          context,
          this.mediatorRdfMetadataAccumulate,
        ))
        .then((meta) => {
          // Add the graph variable to the variables list if not already present
          const hasGraphVar = meta.variables.some(v => v.variable.value === graphVar.value);
          if (!hasGraphVar) {
            meta.variables = [
              ...meta.variables,
              { variable: graphVar, canBeUndef: false },
            ];
          }
          return meta;
        });

    return { type: 'bindings', bindingsStream, metadata };
  }

  /**
   * Check if a named graph exists by attempting to match a single quad in it.
   */
  private async graphExists(
    graphIRI: RDF.NamedNode,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ): Promise<boolean> {
    const sources = this.getSources(undefined, context);
    if (sources.length === 0) {
      return false;
    }

    const varS = dataFactory.variable('__graphExistS');
    const varP = dataFactory.variable('__graphExistP');
    const varO = dataFactory.variable('__graphExistO');

    let pattern: Algebra.Operation;
    if (sources.length === 1) {
      pattern = assignOperationSource(
        algebraFactory.createPattern(varS, varP, varO, graphIRI),
        sources[0],
      );
    } else {
      pattern = algebraFactory.createUnion(
        sources.map(s => assignOperationSource(
          algebraFactory.createPattern(varS, varP, varO, graphIRI),
          s,
        )),
      );
    }

    const slicedOp = algebraFactory.createSlice(pattern, 0, 1);
    const result = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: slicedOp, context }),
    );

    const bindings = await result.bindingsStream.toArray();
    return bindings.length > 0;
  }

  /**
   * Enumerate all named graph IRIs available from the sources.
   * Creates a DISTINCT projection of graph names from quad patterns.
   */
  private async enumerateNamedGraphs(
    graphVar: RDF.Variable,
    innerOperation: Algebra.Operation,
    context: IActionContext,
    dataFactory: ComunicaDataFactory,
    algebraFactory: AlgebraFactory,
  ): Promise<RDF.NamedNode[]> {
    const sources = this.getSources(innerOperation, context);
    if (sources.length === 0) {
      return [];
    }

    const varS = dataFactory.variable('__graphDiscS');
    const varP = dataFactory.variable('__graphDiscP');
    const varO = dataFactory.variable('__graphDiscO');

    let pattern: Algebra.Operation;
    if (sources.length === 1) {
      pattern = assignOperationSource(
        algebraFactory.createPattern(varS, varP, varO, graphVar),
        sources[0],
      );
    } else {
      pattern = algebraFactory.createUnion(
        sources.map(s => assignOperationSource(
          algebraFactory.createPattern(varS, varP, varO, graphVar),
          s,
        )),
      );
    }

    const discoveryOp = algebraFactory.createDistinct(
      algebraFactory.createProject(pattern, [ graphVar ]),
    );

    const result = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: discoveryOp, context }),
    );

    const bindings = await result.bindingsStream.toArray();
    return bindings
      .map(b => b.get(graphVar))
      .filter((v): v is RDF.NamedNode => v?.termType === 'NamedNode');
  }

  /**
   * Get query sources, first from inner operation patterns, then from context.
   */
  private getSources(
    innerOperation: Algebra.Operation | undefined,
    context: IActionContext,
  ): IQuerySourceWrapper[] {
    const sources: IQuerySourceWrapper[] = [];
    const seen = new Set<IQuerySourceWrapper>();

    if (innerOperation) {
      algebraUtils.visitOperation(innerOperation, {
        [Algebra.Types.PATTERN]: {
          visitor: (pat: Algebra.Pattern) => {
            const source = getOperationSource(pat);
            if (source && !seen.has(source)) {
              seen.add(source);
              sources.push(source);
            }
          },
        },
        [Algebra.Types.PATH]: {
          visitor: (path: Algebra.Path) => {
            const source = getOperationSource(path);
            if (source && !seen.has(source)) {
              seen.add(source);
              sources.push(source);
            }
          },
        },
      });
    }

    if (sources.length === 0) {
      return context.get(KeysQueryOperation.querySources) ?? [];
    }
    return sources;
  }

  /**
   * Substitute the graph term into all pattern-like operations in the given operation tree.
   * Only DefaultGraph references in patterns are replaced.
   * Metadata (including source annotations) is preserved.
   */
  public static substituteGraphInOperation(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    graphTerm: RDF.NamedNode | RDF.Variable,
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      // Do not recurse into nested GRAPH operations:
      // their patterns belong to a different graph scope
      [Algebra.Types.GRAPH]: {
        preVisitor: () => ({ continue: false }),
        transform: (op: Algebra.Graph) => op,
      },
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false }),
        transform: (pattern: Algebra.Pattern) => {
          if (pattern.graph.termType === 'DefaultGraph') {
            return Object.assign(
              algebraFactory.createPattern(
                pattern.subject,
                pattern.predicate,
                pattern.object,
                graphTerm,
              ),
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
              algebraFactory.createPath(path.subject, path.predicate, path.object, graphTerm),
              { metadata: path.metadata },
            );
          }
          return path;
        },
      },
    });
  }

  /**
   * Check if an operation tree contains any pattern-like operations.
   */
  public static hasPatterns(operation: Algebra.Operation): boolean {
    let found = false;
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.PATTERN]: { visitor: () => {
        found = true;
      } },
      [Algebra.Types.PATH]: { visitor: () => {
        found = true;
      } },
      [Algebra.Types.LINK]: { visitor: () => {
        found = true;
      } },
      [Algebra.Types.NPS]: { visitor: () => {
        found = true;
      } },
    });
    return found;
  }

  /**
   * Create an empty bindings result with zero cardinality.
   */
  public static emptyBindingsResult(): IQueryOperationResultBindings {
    const bindingsStream: BindingsStream = <BindingsStream> new ArrayIterator<RDF.Bindings>([], { autoStart: false });
    const metadata: () => Promise<MetadataBindings> = async() => ({
      state: new MetadataValidationState(),
      cardinality: { type: 'exact', value: 0 },
      variables: [],
    });
    return { type: 'bindings', bindingsStream, metadata };
  }
}

export interface IActorQueryOperationGraphArgs extends IActorQueryOperationTypedMediatedArgs {
  mediatorRdfMetadataAccumulate: MediatorRdfMetadataAccumulate;
}
