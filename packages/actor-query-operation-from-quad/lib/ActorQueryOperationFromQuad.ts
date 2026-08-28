import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import { ActorQueryOperationTypedMediated } from '@comunica/bus-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory, IActionContext, IQueryOperationResult } from '@comunica/types';
import { Algebra, AlgebraFactory, isKnownOperation } from '@comunica/utils-algebra';
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
   * @param {Operation} operation An operation.
   * @param {(subOperation: Operation) => Operation} recursiveCb A callback for recursive operation calls.
   * @return {Operation} The copied operation.
   */
  public static copyOperation(
    operation: Algebra.Operation,
    recursiveCb: (subOperation: Algebra.Operation) => Algebra.Operation,
  ): Algebra.Operation {
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
    // If the operation is a BGP or Path, change the graph.
    if ((isKnownOperation(operation, Algebra.Types.BGP) && operation.patterns.length > 0) ||
      isKnownOperation(operation, Algebra.Types.PATH) || isKnownOperation(operation, Algebra.Types.PATTERN)) {
      if (isKnownOperation(operation, Algebra.Types.BGP)) {
        return ActorQueryOperationFromQuad
          .joinOperations(algebraFactory, operation.patterns.map((pattern) => {
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
      }
      if (operation.graph.termType !== 'DefaultGraph') {
        return operation;
      }
      const paths = defaultGraphs.map(
        (graph: RDF.Term) => {
          if (isKnownOperation(operation, Algebra.Types.PATH)) {
            return ActorQueryOperationFromQuad.copyMetadata(
              algebraFactory.createPath(operation.subject, operation.predicate, operation.object, graph),
              operation,
            );
          }
          return ActorQueryOperationFromQuad.copyMetadata(
            algebraFactory.createPattern(
              operation.subject,
              operation.predicate,
              operation.object,
              graph,
            ),
            operation,
          );
        },
      );
      return ActorQueryOperationFromQuad.unionOperations(algebraFactory, paths);
    }

    return ActorQueryOperationFromQuad.copyOperation(
      operation,
      subOperation => this.applyOperationDefaultGraph(algebraFactory, subOperation, defaultGraphs),
    );
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
    // If the operation is a BGP or Path, change the graph.
    if ((isKnownOperation(operation, Algebra.Types.BGP) && operation.patterns.length > 0) ||
      isKnownOperation(operation, Algebra.Types.PATH) || isKnownOperation(operation, Algebra.Types.PATTERN)) {
      const patternGraph: RDF.Term = operation.type === 'bgp' ? operation.patterns[0].graph : operation.graph;
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
          if (operation.type === 'bgp') {
            pattern = algebraFactory
              .createBgp(operation.patterns.map((pat: Algebra.Pattern) => ActorQueryOperationFromQuad.copyMetadata(
                algebraFactory.createPattern(pat.subject, pat.predicate, pat.object, graph),
                pat,
              )));
          } else if (operation.type === 'path') {
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
          (graph: RDF.NamedNode) => ActorQueryOperationFromQuad.applyOperationNamedGraph(
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

    return ActorQueryOperationFromQuad.copyOperation(
      operation,
      (subOperation: Algebra.Operation) => this
        .applyOperationNamedGraph(algebraFactory, subOperation, namedGraphs, defaultGraphs),
    );
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
