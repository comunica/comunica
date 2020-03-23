import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
  BindingsStream,
  IActorQueryOperationOutputBindings,
  IActorQueryOperationTypedMediatedArgs,
} from "@comunica/bus-query-operation";
import {ActorRdfJoin} from "@comunica/bus-rdf-join";
import {ActionContext, IActorTest} from "@comunica/core";
import {MultiTransformIterator} from "asynciterator";
import {Algebra, Factory, Util} from "sparqlalgebrajs";
import {PromiseProxyIterator} from "asynciterator-promiseproxy";
import * as RDF from "rdf-js";
import {termToString} from "rdf-string";

/**
 * A comunica LeftJoin left-deep Query Operation Actor.
 */
export class ActorQueryOperationLeftJoinLeftDeep extends ActorQueryOperationTypedMediated<Algebra.LeftJoin> {

  private static readonly FACTORY = new Factory();

  constructor(args: IActorQueryOperationTypedMediatedArgs) {
    super(args, 'leftjoin');
  }

  /**
   * Create a new bindings stream
   * that takes every binding of the base stream,
   * materializes the remaining patterns with it,
   * and emits all bindings from this new set of patterns.
   * @param {BindingsStream} leftStream The base stream.
   * @param {Algebra.Operation} rightOperation The operation to materialize with each binding of the base stream.
   * @param {Algebra.Operation => Promise<BindingsStream>} operationBinder A callback to retrieve the bindings stream
   *                                                                       of an operation.
   * @return {BindingsStream}
   */
  public static createLeftDeepStream(leftStream: BindingsStream, rightOperation: Algebra.Operation,
                                     operationBinder: (operation: Algebra.Operation) => Promise<BindingsStream>)
    : BindingsStream {
    const bindingsStream: MultiTransformIterator<Bindings, Bindings> = new MultiTransformIterator(leftStream,
      { optional: true });
    bindingsStream._createTransformer = (bindings: Bindings) => {
      const bindingsMerger = (subBindings: Bindings) => subBindings.merge(bindings);
      return new PromiseProxyIterator(
        async () => (await operationBinder(ActorQueryOperationLeftJoinLeftDeep.materializeOperation(
          rightOperation, bindings))).map(bindingsMerger), { autoStart: true, maxBufferSize: 128 });
    };
    return bindingsStream;
  }

  /**
   * Materialize the given operation with the given bindings.
   * @param {Operation} operation SPARQL algebra operation.
   * @param {Bindings} bindings A bindings object.
   * @return Algebra.Operation A new operation materialized with the given bindings.
   */
  public static materializeOperation(operation: Algebra.Operation, bindings: Bindings): Algebra.Operation {
    return Util.mapOperation(operation, {
      path: (op: Algebra.Path, factory: Factory) => {
        return {
          recurse: false,
          result: factory.createPath(
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.subject, bindings),
            op.predicate,
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.object, bindings),
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.graph, bindings),
          ),
        };
      },
      pattern: (op: Algebra.Pattern, factory: Factory) => {
        return {
          recurse: false,
          result: factory.createPattern(
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.subject, bindings),
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.predicate, bindings),
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.object, bindings),
            ActorQueryOperationLeftJoinLeftDeep.materializeTerm(op.graph, bindings),
          ),
        };
      },
    });
  }

  /**
   * Materialize a term with the given binding.
   *
   * If the given term is a variable (or blank node)
   * and that variable exist in the given bindings object,
   * the value of that binding is returned.
   * In all other cases, the term itself is returned.
   *
   * @param {RDF.Term} term A term.
   * @param {Bindings} bindings A bindings object.
   * @return {RDF.Term} The materialized term.
   */
  public static materializeTerm(term: RDF.Term, bindings: Bindings): RDF.Term {
    if (term.termType === 'Variable') {
      const value: RDF.Term = bindings.get(termToString(term));
      if (value) {
        return value;
      }
    }
    return term;
  }

  public async testOperation(pattern: Algebra.LeftJoin, context: ActionContext): Promise<IActorTest> {
    return true;
  }

  public async runOperation(pattern: Algebra.LeftJoin, context: ActionContext)
    : Promise<IActorQueryOperationOutputBindings> {
    // Initiate left and right operations
    // Only the left stream will be used.
    // The right stream is ignored and only its metadata and variables are used.
    const left = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation
      .mediate({ operation: pattern.left, context }));
    const right = ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation
      .mediate({ operation: pattern.right, context }));

    // If an expression was defined, wrap the right operation in a filter expression.
    const rightOperation = pattern.expression
      ? ActorQueryOperationLeftJoinLeftDeep.FACTORY.createFilter(pattern.right, pattern.expression)
      : pattern.right;

    // Create a left-deep stream with left and right.
    const bindingsStream = ActorQueryOperationLeftJoinLeftDeep.createLeftDeepStream(left.bindingsStream, rightOperation,
      async (operation: Algebra.Operation) => ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation, context })).bindingsStream);

    // Determine variables and metadata
    const variables = ActorRdfJoin.joinVariables({ entries: [left, right] });
    const metadata = () => Promise.all([left, right].map((entry) => entry.metadata()))
      .then((metadatas) => metadatas.reduce((acc, val) => acc * val.totalItems, 1))
      .catch(() => Infinity)
      .then((totalItems) => ({ totalItems }));

    return { type: 'bindings', bindingsStream, metadata, variables };
  }

}
