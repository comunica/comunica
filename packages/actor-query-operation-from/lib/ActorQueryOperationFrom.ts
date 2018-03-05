import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
import * as RDF from "rdf-js";
import {Algebra, Factory} from "sparqlalgebrajs";

/**
 * A comunica From Query Operation Actor.
 */
export class ActorQueryOperationFrom extends ActorQueryOperationTypedMediated<Algebra.From> {

  private static FACTORY: Factory = new Factory();
  private static ALGEBRA_TYPES: string[] = Object.keys(Algebra.types).map((key) => (<any> Algebra.types)[key]);

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'from');
  }

  /**
   * Recursively transform the given operation to use the given graph as default graph
   * This will create a new operation and not modify the given operation.
   * @param {Operation} operation An operation.
   * @param {RDF.Term} graph A graph term.
   * @return {Operation} A new operation.
   */
  public static applyOperationGraph(operation: Algebra.Operation, graph: RDF.Term): Algebra.Operation {
    // If the operation is a BGP or Path, change the graph.
    if (operation.type === 'bgp') {
      return ActorQueryOperationFrom.FACTORY.createBgp((<Algebra.Bgp> operation).patterns.map(
        (quad) => quad.graph.termType === 'DefaultGraph'
          ? ActorQueryOperationFrom.FACTORY.createPattern(quad.subject, quad.predicate, quad.object, graph) : quad));
    } else if (operation.type === 'path') {
      const path: Algebra.Path = <Algebra.Path> operation;
      return ActorQueryOperationFrom.FACTORY.createPath(path.subject, path.predicate, path.object,
        path.graph.termType === 'DefaultGraph' ? graph : path.graph);
    }

    // Otherwise, copy the operation and recursively call this method.
    const copiedOperation: Algebra.Operation = <any> {};
    for (const key of Object.keys(operation)) {
      if (Array.isArray(operation[key])) {
        if (key === 'variables') {
          copiedOperation[key] = operation[key];
        } else {
          copiedOperation[key] = operation[key]
            .map((subOperation: any) => this.applyOperationGraph(subOperation, graph));
        }
      } else if (ActorQueryOperationFrom.ALGEBRA_TYPES.indexOf(operation[key].type) >= 0) {
        copiedOperation[key] = this.applyOperationGraph(operation[key], graph);
      } else {
        copiedOperation[key] = operation[key];
      }
    }
    return copiedOperation;
  }

  /**
   * Transform the given array of operations into a union operation.
   * @param {Operation[]} operations An array of operations, must contain at least two operations.
   * @return {Union} A union operation.
   */
  public static unionOperations(operations: Algebra.Operation[]): Algebra.Union {
    if (operations.length === 2) {
      return ActorQueryOperationFrom.FACTORY.createUnion(operations[0], operations[1]);
    } else if (operations.length > 2) {
      return ActorQueryOperationFrom.FACTORY.createUnion(operations.shift(), this.unionOperations(operations));
    } else {
      throw new Error('A union can only be applied on at least two operations');
    }
  }

  /**
   * Transform a context based on the named graphs in the pattern.
   * FROM NAMED indicates which named graphs are available.
   * Add these graphs to the context so that quad pattern resolvers can use this information
   * to ONLY select data from these graphs.
   * @param {From} pattern
   * @param {{[p: string]: any}} context A context.
   * @return {{[p: string]: any}} A transformed context.
   */
  public static transformContext(pattern: Algebra.From, context?: { [id: string]: any }): { [id: string]: any } {
    if (pattern.named.length) {
      context = Object.assign({}, context || {});
      if (context.namedGraphs) {
        context.namedGraphs = require('lodash.intersectionwith')(context.namedGraphs, pattern.named,
          (ths: RDF.Term, tht: RDF.Term) => ths.equals(tht));
      } else {
        context.namedGraphs = pattern.named;
      }
    }
    return context;
  }

  /**
   * Transform an operation based on the default graphs in the pattern.
   * FROM sets the default graph.
   * If multiple are available, take the union of the operation for all of them.
   * @param {From} pattern A from operation.
   * @return {Operation} The transformed operation.
   */
  public static createOperation(pattern: Algebra.From): Algebra.Operation {
    if (!pattern.default.length) {
      return pattern.input;
    } else if (pattern.default.length === 1) {
      return ActorQueryOperationFrom.applyOperationGraph(pattern.input, pattern.default[0]);
    } else {
      return ActorQueryOperationFrom.unionOperations(pattern.default.map(
        (graph: RDF.Term) => ActorQueryOperationFrom.applyOperationGraph(pattern.input, graph)));
    }
  }

  public async testOperation(pattern: Algebra.From, context?: { [id: string]: any }): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.From, context?: { [id: string]: any })
  : Promise<IActorQueryOperationOutput> {
    context = ActorQueryOperationFrom.transformContext(pattern, context);
    const operation: Algebra.Operation = ActorQueryOperationFrom.createOperation(pattern);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
