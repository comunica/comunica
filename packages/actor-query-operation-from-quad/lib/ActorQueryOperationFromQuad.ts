import {ActorQueryOperationTypedMediated, IActorQueryOperationOutput,
  IActorQueryOperationTypedMediatedArgs} from "@comunica/bus-query-operation";
import {IActorTest} from "@comunica/core";
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
   * Recursively transform the given operation to use the given graphs as default graph
   * This will (possibly) create a new operation and not modify the given operation.
   * @param {Operation} operation An operation.
   * @param {RDF.Term[]} graphs Graph terms.
   * @return {Operation} A new operation.
   */
  public static applyOperationGraph(operation: Algebra.Operation, graphs: RDF.Term[]): Algebra.Operation {
    // If the operation is a Pattern or Path, change the graph.
    if (operation.type === 'pattern') {
      const pattern: Algebra.Pattern = <Algebra.Pattern> operation;
      const defaultGraph: boolean = pattern.graph.termType === 'DefaultGraph';
      if (graphs.length === 1) {
        const graph: RDF.Term = graphs[0];
        return defaultGraph ? ActorQueryOperationFromQuad.FACTORY
            .createPattern(pattern.subject, pattern.predicate, pattern.object, graph) : pattern;
      } else {
        return defaultGraph ? ActorQueryOperationFromQuad.unionOperations(graphs.map(
          (graph: RDF.Term) => ActorQueryOperationFromQuad.applyOperationGraph(operation, [graph])))
          : operation;
      }
    } else if (operation.type === 'path') {
      const path: Algebra.Path = <Algebra.Path> operation;
      const defaultGraph: boolean = path.graph.termType === 'DefaultGraph';
      if (graphs.length === 1) {
        const graph: RDF.Term = graphs[0];
        return defaultGraph ? ActorQueryOperationFromQuad.FACTORY
          .createPath(path.subject, path.predicate, path.object, graph) : path;
      } else {
        return defaultGraph ? ActorQueryOperationFromQuad.unionOperations(graphs.map(
          (graph: RDF.Term) => ActorQueryOperationFromQuad.applyOperationGraph(operation, [graph])))
          : operation;
      }
    }

    // Otherwise, copy the operation and recursively call this method.
    const copiedOperation: Algebra.Operation = <any> {};
    for (const key of Object.keys(operation)) {
      if (Array.isArray(operation[key])) {
        if (key === 'variables') {
          copiedOperation[key] = operation[key];
        } else {
          copiedOperation[key] = operation[key]
            .map((subOperation: any) => this.applyOperationGraph(subOperation, graphs));
        }
      } else if (ActorQueryOperationFromQuad.ALGEBRA_TYPES.indexOf(operation[key].type) >= 0) {
        copiedOperation[key] = this.applyOperationGraph(operation[key], graphs);
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
      return ActorQueryOperationFromQuad.FACTORY.createUnion(operations[0], operations[1]);
    } else if (operations.length > 2) {
      return ActorQueryOperationFromQuad.FACTORY.createUnion(operations.shift(), this.unionOperations(operations));
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
   * If multiple are available, take the union of the operation for all of them at quad-pattern level.
   * @param {From} pattern A from operation.
   * @return {Operation} The transformed operation.
   */
  public static createOperation(pattern: Algebra.From): Algebra.Operation {
    if (!pattern.default.length) {
      return pattern.input;
    }
    return ActorQueryOperationFromQuad.applyOperationGraph(pattern.input, pattern.default);
  }

  public async testOperation(pattern: Algebra.From, context?: { [id: string]: any }): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.From, context?: { [id: string]: any })
  : Promise<IActorQueryOperationOutput> {
    context = ActorQueryOperationFromQuad.transformContext(pattern, context);
    const operation: Algebra.Operation = ActorQueryOperationFromQuad.createOperation(pattern);
    return this.mediatorQueryOperation.mediate({ operation, context });
  }
}
