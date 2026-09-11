import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica From Query Operation Actor.
 */
export class ActorQueryOperationFromQuad extends ActorQueryOperationTypedMediated<Algebra.From> {
  private static readonly ALGEBRA_TYPES: string[] = Object.keys(Algebra.Types).map(key => (<any> Algebra.Types)[key]);

  public constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, Algebra.Types.FROM);
  }

  /**
   * Create a deep copy of the given operation.
   *
   * The graph transformations of this actor no longer use this: they let an algebra traversal copy the
   * operations they rewrite. It is part of the public API of this actor though, so it stays.
   * @param {Operation} operation An operation.
   * @param {(subOperation: Operation) => Operation} recursiveCb A callback for recursive operation calls.
   * @return {Operation} The copied operation.
   */
  public static copyOperation(
    operation: Algebra.Operation,
    recursiveCb: (subOperation: Algebra.Operation) => Algebra.Operation,
  ): Algebra.Operation {
    // TODO (next major): can be removed
    const copiedOperation: Algebra.Operation = <any> {};
    for (const [ key, value ] of Object.entries(operation)) {
      const castedKey = <keyof typeof operation> key;
      if (Array.isArray(value) && key !== 'template') {
        // We exclude the 'template' entry, as we don't want to modify the template value of construct operations
        if (key === 'variables') {
          copiedOperation[castedKey] = <any> value;
        } else {
          copiedOperation[castedKey] = <any> value.map(recursiveCb);
        }
      } else if (ActorQueryOperationFromQuad.ALGEBRA_TYPES.includes(value.type)) {
        copiedOperation[castedKey] = <any> recursiveCb(value);
      } else {
        copiedOperation[castedKey] = value;
      }
    }
    return copiedOperation;
  }

  /**
   * Copy the metadata of the given original operation onto the given new operation.
   * This is required because operations are recreated with a different graph in this actor,
   * and the metadata may contain information that must be retained, such as the source annotation.
   * @param {Operation} operationNew The new operation to copy the metadata to. This operation is mutated.
   * @param {Operation} operationOriginal The original operation to copy the metadata from.
   * @return {Operation} The new operation.
   */
  public static copyMetadata<O extends Algebra.Operation>(operationNew: O, operationOriginal: Algebra.Operation): O {
    if (operationOriginal.metadata) {
      operationNew.metadata = operationOriginal.metadata;
    }
    return operationNew;
  }

  /**
   * Recursively transform the given operation to use the given graphs as default graph
   * This will (possibly) create a new operation and not modify the given operation.
   * @package
   * @param algebraFactory The algebra factory.
   * @param {Operation} operation An operation.
   * @param {RDF.Term[]} defaultGraphs Graph terms.
   * @return {Operation} A new operation.
   */
  public static applyOperationDefaultGraph(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    defaultGraphs: RDF.Term[],
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.BGP]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: (bgp) => {
          if (bgp.patterns.length === 0) {
            return bgp;
          }
          return ActorQueryOperationFromQuad
            .joinOperations(algebraFactory, bgp.patterns.map((pattern) => {
              if (pattern.graph.termType !== 'DefaultGraph') {
                return algebraFactory.createBgp([ pattern ]);
              }
              const bgps = defaultGraphs.map((graph: RDF.Term) =>
                algebraFactory.createBgp([ ActorQueryOperationFromQuad.copyMetadata(
                  algebraFactory
                    .createPattern(pattern.subject, pattern.predicate, pattern.object, graph),
                  pattern,
                ) ]));
              return ActorQueryOperationFromQuad.unionOperations(algebraFactory, bgps);
            }));
        },
      },
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: (path) => {
          if (path.graph.termType !== 'DefaultGraph') {
            return path;
          }
          const paths = defaultGraphs.map(graph => ActorQueryOperationFromQuad.copyMetadata(
            algebraFactory.createPath(path.subject, path.predicate, path.object, graph),
            path,
          ));
          return ActorQueryOperationFromQuad.unionOperations(algebraFactory, paths);
        },
      },
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: (pattern) => {
          if (pattern.graph.termType !== 'DefaultGraph') {
            return pattern;
          }
          const paths = defaultGraphs.map(graph => ActorQueryOperationFromQuad.copyMetadata(
            algebraFactory.createPattern(pattern.subject, pattern.predicate, pattern.object, graph),
            pattern,
          ));
          return ActorQueryOperationFromQuad.unionOperations(algebraFactory, paths);
        },
      },
      // A construct template holds the quads to produce, it is never matched against the dataset.
      [Algebra.Types.CONSTRUCT]: { preVisitor: () => ({ ignoreKeys: new Set([ 'template', 'metadata' ]) }) },
    });
  }

  /**
   * Recursively transform the given operation to use the given graphs as named graph
   * This will (possibly) create a new operation and not modify the given operation.
   * @package
   * @param algebraFactory The algebra factory.
   * @param {Operation} operation An operation.
   * @param {RDF.Term[]} namedGraphs Graph terms, as defined by FROM NAMED.
   * @param {RDF.Term[]} defaultGraphs Default graph terms, as defined by FROM.
   * @return {Operation} A new operation.
   */
  public static applyOperationNamedGraph(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    namedGraphs: RDF.NamedNode[],
    defaultGraphs: RDF.Term[],
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.BGP]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: bgp => bgp.patterns.length === 0 ?
          bgp :
          ActorQueryOperationFromQuad.applyNamedGraphToPattern(algebraFactory, bgp, namedGraphs, defaultGraphs),
      },
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: path => ActorQueryOperationFromQuad
          .applyNamedGraphToPattern(algebraFactory, path, namedGraphs, defaultGraphs),
      },
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false, copy: false }),
        transform: pattern => ActorQueryOperationFromQuad
          .applyNamedGraphToPattern(algebraFactory, pattern, namedGraphs, defaultGraphs),
      },
      [Algebra.Types.CONSTRUCT]: { preVisitor: () => ({ ignoreKeys: new Set([ 'template', 'metadata' ]) }) },
    });
  }

  /**
   * Transform a single BGP, quad pattern or property path to use the given graphs as named graph.
   * @param algebraFactory The algebra factory.
   * @param operation A BGP, quad pattern or property path operation.
   * @param {RDF.Term[]} namedGraphs Graph terms, as defined by FROM NAMED.
   * @param {RDF.Term[]} defaultGraphs Default graph terms, as defined by FROM.
   * @return {Operation} A new operation.
   */
  private static applyNamedGraphToPattern(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Bgp | Algebra.Path | Algebra.Pattern,
    namedGraphs: RDF.NamedNode[],
    defaultGraphs: RDF.Term[],
  ): Algebra.Operation {
    const patternGraph: RDF.Term = algebraUtils.isKnownOperation(operation, Algebra.Types.BGP) ?
      operation.patterns[0].graph :
      operation.graph;
    if (patternGraph.termType === 'DefaultGraph') {
      // Patterns over the default graph are not restricted by FROM NAMED.
      // They are handled afterwards by the default graph transformation.
      if (defaultGraphs.length > 0) {
        return operation;
      }
      // SPARQL 1.0 spec (8.2) and SPARQL 1.1 spec (13.2) describe that
      // when FROM NAMED's are used without a FROM, the default graph must be empty.
      return algebraFactory.createValues([], []);
    }
    if (patternGraph.termType === 'Variable') {
      if (namedGraphs.length === 0) {
        return algebraFactory.createValues([], []);
      }
      if (namedGraphs.length === 1) {
        const graph: RDF.NamedNode = namedGraphs[0];
        // If the pattern graph is a variable, replace the graph and bind the variable using VALUES
        const bindings: Record<string, RDF.Literal | RDF.NamedNode> = {};
        bindings[patternGraph.value] = graph;
        const values: Algebra.Values = algebraFactory
          .createValues([ patternGraph ], [ bindings ]);

        let pattern: Algebra.Operation;
        if (isKnownOperation(operation, Algebra.Types.BGP)) {
          pattern = algebraFactory
            .createBgp(operation.patterns.map((pat: Algebra.Pattern) => ActorQueryOperationFromQuad.copyMetadata(
              algebraFactory.createPattern(pat.subject, pat.predicate, pat.object, graph),
              pat,
            )));
        } else if (isKnownOperation(operation, Algebra.Types.PATH)) {
          pattern = ActorQueryOperationFromQuad.copyMetadata(
            algebraFactory.createPath(operation.subject, operation.predicate, operation.object, graph),
            operation,
          );
        } else {
          pattern = ActorQueryOperationFromQuad.copyMetadata(
            algebraFactory.createPattern(operation.subject, operation.predicate, operation.object, graph),
            operation,
          );
        }

        return algebraFactory.createJoin([ values, pattern ]);
      }
      // If the pattern graph is a variable, take the union of the pattern applied to each available named graph
      return ActorQueryOperationFromQuad.unionOperations(algebraFactory, namedGraphs.map(
        (graph: RDF.NamedNode) => ActorQueryOperationFromQuad.applyNamedGraphToPattern(
          algebraFactory,
          operation,
          [ graph ],
          defaultGraphs,
        ),
      ));
    }
    // The pattern's graph is defined.
    // SPARQL 1.0 spec (8.2) and SPARQL 1.1 spec (13.2) describe that only the graphs from FROM NAMED
    // are available as named graphs, so graphs that were only selected in a FROM must not be matched here.
    const isNamedGraphAvailable: boolean = namedGraphs.some(
      (namedGraph: RDF.Term) => namedGraph.equals(patternGraph),
    );
    if (isNamedGraphAvailable) {
      // Return the pattern as-is if the pattern's graph was selected in a FROM NAMED
      return operation;
    }
    // No-op if the pattern's graph was not selected in a FROM NAMED.
    return algebraFactory.createValues([], []);
  }

  /**
   * Transform the given array of operations into a join operation.
   * @package
   * @param algebraFactory The algebra factory.
   * @param {Operation[]} operations An array of operations, must contain at least one operation.
   * @return {Join} A join operation.
   */
  public static joinOperations(algebraFactory: AlgebraFactory, operations: Algebra.Operation[]): Algebra.Operation {
    if (operations.length === 1) {
      return operations[0];
    }
    if (operations.length > 1) {
      return algebraFactory.createJoin(operations);
    }
    throw new Error('A join can only be applied on at least one operation');
  }

  /**
   * Transform the given array of operations into a union operation.
   * @package
   * @param algebraFactory The algebra factory.
   * @param {Operation[]} operations An array of operations, must contain at least one operation.
   * @return {Union} A union operation.
   */
  public static unionOperations(algebraFactory: AlgebraFactory, operations: Algebra.Operation[]): Algebra.Operation {
    if (operations.length === 1) {
      return operations[0];
    }
    if (operations.length > 1) {
      return algebraFactory.createUnion(operations);
    }
    throw new Error('A union can only be applied on at least one operation');
  }

  /**
   * Transform an operation based on the default and named graphs in the pattern.
   *
   * FROM sets the default graph.
   * If multiple are available, take the union of the operation for all of them at quad-pattern level.
   *
   * FROM NAMED indicates which named graphs are available.
   * This will rewrite the query so that only triples from the given named graphs can be selected.
   *
   * @package
   * @param algebraFactory The algebra factory.
   * @param {From} pattern A from operation.
   * @return {Operation} The transformed operation.
   */
  public static createOperation(algebraFactory: AlgebraFactory, pattern: Algebra.From): Algebra.Operation {
    let operation: Algebra.Operation = pattern.input;
    // The named graph transformation must be applied first,
    // as it needs to distinguish patterns that apply to the default graph
    // from patterns that were explicitly scoped to a graph via GRAPH.
    if (pattern.named.length > 0 || pattern.default.length > 0) {
      operation = ActorQueryOperationFromQuad
        .applyOperationNamedGraph(algebraFactory, operation, pattern.named, pattern.default);
    }
    if (pattern.default.length > 0) {
      operation = ActorQueryOperationFromQuad.applyOperationDefaultGraph(algebraFactory, operation, pattern.default);
    }
    return operation;
  }

  public async testOperation(_operation: Algebra.From, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(
    operationOriginal: Algebra.From,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const operation: Algebra.Operation = ActorQueryOperationFromQuad.createOperation(algebraFactory, operationOriginal);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
