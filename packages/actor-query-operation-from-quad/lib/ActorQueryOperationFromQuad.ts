import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {ActionContext, IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A comunica From Query Operation Actor.
 */
export class ActorQueryOperationFromQuad extends ActorQueryOperationTypedMediated<Algebra.From> {

  private static FACTORY: Factory = new Factory();
  private static ALGEBRA_TYPES: string[] = Object.keys(Algebra.types).map((key) => (<any> Algebra.types)[key]);

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'from');
  }

  /**
   * Create a deep copy of the given operation.
   * @param {Operation} operation An operation.
   * @param {(subOperation: Operation) => Operation} recursiveCb A callback for recursive operation calls.
   * @return {Operation} The copied operation.
   */
  public static copyOperation(operation: Algebra.Operation,
                              recursiveCb: (subOperation: Algebra.Operation) => Algebra.Operation): Algebra.Operation {
    const copiedOperation: Algebra.Operation = <any> {};
    for (const key of Object.keys(operation)) {
      if (Array.isArray(operation[key])) {
        if (key === 'variables') {
          copiedOperation[key] = operation[key];
        } else {
          copiedOperation[key] = operation[key].map(recursiveCb);
        }
      } else if (ActorQueryOperationFromQuad.ALGEBRA_TYPES.indexOf(operation[key].type) >= 0) {
        copiedOperation[key] = recursiveCb(operation[key]);
      } else {
        copiedOperation[key] = operation[key];
      }
    }
    return copiedOperation;
  }

  /**
   * Recursively transform the given operation to use the given graphs as default graph
   * This will (possibly) create a new operation and not modify the given operation.
   * @param {Operation} operation An operation.
   * @param {RDF.Term[]} defaultGraphs Graph terms.
   * @return {Operation} A new operation.
   */
  public static applyOperationDefaultGraph(operation: Algebra.Operation, defaultGraphs: RDF.Term[]): Algebra.Operation {
    // If the operation is a BGP or Path, change the graph.
    if ((operation.type === 'bgp' && operation.patterns.length) || operation.type === 'path') {
      if (operation.type === 'bgp') {
        return ActorQueryOperationFromQuad.joinOperations(operation.patterns.map((pattern: Algebra.Pattern) => {
          if (pattern.graph.termType !== 'DefaultGraph') {
            return ActorQueryOperationFromQuad.FACTORY.createBgp([pattern]);
          }
          const bgps = defaultGraphs.map((graph: RDF.Term) =>
            ActorQueryOperationFromQuad.FACTORY.createBgp([ActorQueryOperationFromQuad.FACTORY
              .createPattern(pattern.subject, pattern.predicate, pattern.object, graph)]));
          return ActorQueryOperationFromQuad.unionOperations(bgps);
        }));
      } else {
        if (operation.graph.termType !== 'DefaultGraph') {
          return operation;
        }
        const paths = defaultGraphs.map(
          (graph: RDF.Term) => ActorQueryOperationFromQuad.FACTORY
            .createPath(operation.subject, operation.predicate, operation.object, graph));
        return ActorQueryOperationFromQuad.joinOperations(paths);
      }
    }

    return ActorQueryOperationFromQuad.copyOperation(operation,
      (subOperation: Algebra.Operation) => this.applyOperationDefaultGraph(subOperation, defaultGraphs));
  }

  /**
   * Recursively transform the given operation to use the given graphs as named graph
   * This will (possibly) create a new operation and not modify the given operation.
   * @param {Operation} operation An operation.
   * @param {RDF.Term[]} namedGraphs Graph terms.
   * @return {Operation} A new operation.
   */
  public static applyOperationNamedGraph(operation: Algebra.Operation, namedGraphs: RDF.Term[],
                                         defaultGraphs: RDF.Term[]): Algebra.Operation {
    // If the operation is a BGP or Path, change the graph.
    if ((operation.type === 'bgp' && operation.patterns.length) || operation.type === 'path') {
      let patternGraph: RDF.Term;
      if (operation.type === 'bgp') {
        // We assume that the BGP has at least one pattern and all have the same graph.
        patternGraph = operation.patterns[0].graph;
      } else {
        patternGraph = operation.graph;
      }
      if (patternGraph.termType === 'DefaultGraph') {
        // SPARQL spec (8.2) describes that when FROM NAMED's are used without a FROM, the default graph must be empty.
        // The FROMs are transformed before this step to a named node, so this will not apply to this case anymore.
        return { type: 'bgp', patterns: [] };
      } else if (patternGraph.termType === 'Variable') {
        if (namedGraphs.length === 1) {
          const graph: RDF.Term = namedGraphs[0];
          // If the pattern graph is a variable, replace the graph and bind the variable using VALUES
          const bindings: {[key: string]: RDF.Term} = {};
          bindings['?' + patternGraph.value] = graph;
          const values: Algebra.Values = ActorQueryOperationFromQuad.FACTORY
            .createValues([<RDF.Variable> patternGraph], [bindings]);
          let pattern: Algebra.Operation;
          if (operation.type === 'bgp') {
            pattern = ActorQueryOperationFromQuad.FACTORY
              .createBgp(operation.patterns.map((p: Algebra.Pattern) => ActorQueryOperationFromQuad.FACTORY
                .createPattern(p.subject, p.predicate, p.object, graph)));
          } else {
            pattern = ActorQueryOperationFromQuad.FACTORY
              .createPath(operation.subject, operation.predicate, operation.object, graph);
          }
          return ActorQueryOperationFromQuad.FACTORY.createJoin(values, pattern);
        } else {
          // If the pattern graph is a variable, take the union of the pattern applied to each available named graph
          return ActorQueryOperationFromQuad.unionOperations(namedGraphs.map(
            (graph: RDF.Term) => ActorQueryOperationFromQuad.applyOperationNamedGraph(
              operation, [graph], defaultGraphs)));
        }
      } else {
        // The pattern's graph is defined (including the default graphs)
        const isNamedGraphAvailable: boolean = require('lodash.find')(namedGraphs.concat(defaultGraphs),
          (namedGraph: RDF.Term) => namedGraph.equals(patternGraph));
        if (isNamedGraphAvailable) {
          // Return the pattern as-is if the pattern's graph was selected in a FROM NAMED
          return operation;
        } else {
          // No-op if the pattern's graph was not selected in a FROM NAMED.
          return { type: 'bgp', patterns: [] };
        }
      }
    }

    return ActorQueryOperationFromQuad.copyOperation(operation,
      (subOperation: Algebra.Operation) => this.applyOperationNamedGraph(subOperation, namedGraphs, defaultGraphs));
  }

  /**
   * Transform the given array of operations into a join operation.
   * @param {Operation[]} operations An array of operations, must contain at least one operation.
   * @return {Join} A join operation.
   */
  public static joinOperations(operations: Algebra.Operation[]): Algebra.Operation {
    if (operations.length === 1) {
      return operations[0];
    } else if (operations.length === 2) {
      return ActorQueryOperationFromQuad.FACTORY.createJoin(operations[0], operations[1]);
    } else if (operations.length > 2) {
      return ActorQueryOperationFromQuad.FACTORY.createJoin(operations.shift(), this.joinOperations(operations));
    } else {
      throw new Error('A join can only be applied on at least one operation');
    }
  }

  /**
   * Transform the given array of operations into a union operation.
   * @param {Operation[]} operations An array of operations, must contain at least one operation.
   * @return {Union} A union operation.
   */
  public static unionOperations(operations: Algebra.Operation[]): Algebra.Operation {
    if (operations.length === 1) {
      return operations[0];
    } else if (operations.length === 2) {
      return ActorQueryOperationFromQuad.FACTORY.createUnion(operations[0], operations[1]);
    } else if (operations.length > 2) {
      return ActorQueryOperationFromQuad.FACTORY.createUnion(operations.shift(), this.unionOperations(operations));
    } else {
      throw new Error('A union can only be applied on at least one operation');
    }
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
   * @param {From} pattern A from operation.
   * @return {Operation} The transformed operation.
   */
  public static createOperation(pattern: Algebra.From): Algebra.Operation {
    let operation: Algebra.Operation = pattern.input;
    if (pattern.default.length) {
      operation = ActorQueryOperationFromQuad.applyOperationDefaultGraph(operation, pattern.default);
    }
    if (pattern.named.length) {
      operation = ActorQueryOperationFromQuad.applyOperationNamedGraph(operation, pattern.named, pattern.default);
    }
    return operation;
  }

  public async testOperation(pattern: Algebra.From, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.From, context: ActionContext)
  : Promise<IActorQueryOperationOutput> {
    const operation: Algebra.Operation = ActorQueryOperationFromQuad.createOperation(pattern);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
