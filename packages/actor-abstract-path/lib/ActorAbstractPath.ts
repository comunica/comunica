import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperation,
  ActorQueryOperationTypedMediated,
  Bindings,
} from '@comunica/bus-query-operation';
import type { IActorTest } from '@comunica/core';
import { ActionContext } from '@comunica/core';
import type { IActorQueryOperationOutputBindings } from '@comunica/types';
import type { AsyncIterator } from 'asynciterator';
import { BufferedIterator, MultiTransformIterator,
  TransformIterator, EmptyIterator } from 'asynciterator';
import { DataFactory } from 'rdf-data-factory';
import type { Term, Variable } from 'rdf-js';
import { termToString } from 'rdf-string';
import type { Algebra } from 'sparqlalgebrajs';
import { Factory } from 'sparqlalgebrajs';
const DF = new DataFactory();

/**
 * An abstract actor that handles Path operations.
 *
 * Provides multiple helper functions used by the Path operation actors.
 */
export abstract class ActorAbstractPath extends ActorQueryOperationTypedMediated<Algebra.Path> {
  protected static readonly FACTORY: Factory = new Factory();

  protected readonly predicateType: string;

  public static isPathArbitraryLengthDistinctKey = 'isPathArbitraryLengthDistinct';

  protected constructor(args: IActorQueryOperationTypedMediatedArgs, predicateType: string) {
    super(args, 'path');
    this.predicateType = predicateType;
  }

  public async testOperation(pattern: Algebra.Path, context: ActionContext): Promise<IActorTest> {
    if (pattern.predicate.type !== this.predicateType) {
      throw new Error(`This Actor only supports ${this.predicateType} Path operations.`);
    }

    return true;
  }

  // Generates a variable that does not yet occur in the path
  public generateVariable(path?: Algebra.Path, name?: string): Variable {
    if (!name) {
      return this.generateVariable(path, 'b');
    }

    // Path predicates can't contain variables
    if (path && (path.subject.value === name || path.object.value === name)) {
      return this.generateVariable(path, `${name}b`);
    }

    return DF.variable(name);
  }

  // Such connectivity matching does not introduce duplicates (it does not incorporate any count of the number
  // of ways the connection can be made) even if the repeated path itself would otherwise result in duplicates.
  // https://www.w3.org/TR/sparql11-query/#propertypaths
  public async isPathArbitraryLengthDistinct(context: ActionContext, path: Algebra.Path):
  Promise<{ context: ActionContext; operation: IActorQueryOperationOutputBindings | undefined }> {
    if (!context || !context.get(ActorAbstractPath.isPathArbitraryLengthDistinctKey)) {
      context = context ?
        context.set(ActorAbstractPath.isPathArbitraryLengthDistinctKey, true) :
        ActionContext({ [ActorAbstractPath.isPathArbitraryLengthDistinctKey]: true });
      return { context,
        operation: ActorQueryOperation.getSafeBindings(await this.mediatorQueryOperation.mediate({
          operation: ActorAbstractPath.FACTORY.createDistinct(path),
          context,
        })) };
    }

    context = context.set(ActorAbstractPath.isPathArbitraryLengthDistinctKey, false);
    return { context, operation: undefined };
  }

  private async predicateStarGraphVariable(subject: Term, object: Variable, predicate: Algebra.PropertyPathSymbol,
    graph: Term, context: ActionContext): Promise<AsyncIterator<Bindings>> {
    // Construct path to obtain all graphs where subject exists
    const predVar = this.generateVariable(ActorAbstractPath.FACTORY.createPath(subject, predicate, object, graph));
    const findGraphs = ActorAbstractPath.FACTORY.createUnion(
      ActorAbstractPath.FACTORY.createPattern(subject, predVar, object, graph),
      ActorAbstractPath.FACTORY.createPattern(object, predVar, subject, graph),
    );
    const results = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ context, operation: findGraphs }),
    );

    const objectString = termToString(object);
    const passedGraphs: Set<string> = new Set();

    return new MultiTransformIterator(
      results.bindingsStream,
      {
        multiTransform: (bindings: Bindings) => {
          // Extract the graph and start a predicate* search starting from subject in each graph
          const graphValue = bindings.get(termToString(graph));
          if (passedGraphs.has(termToString(graphValue))) {
            return new EmptyIterator();
          }
          passedGraphs.add(termToString(graphValue));
          return new TransformIterator<Bindings>(
            async() => {
              const it = new BufferedIterator<Term>();
              await this.getObjectsPredicateStar(subject, predicate, graphValue, context, {}, it, { count: 0 });
              return it.transform<Bindings>({
                transform(item, next, push) {
                  push(Bindings({ [objectString]: item, [termToString(graph)]: graphValue }));
                  next();
                },
              });
            }, { maxBufferSize: 128 },
          );
        },
        autoStart: false,
      },
    );
  }

  /**
     * Returns an iterator with Bindings of the query subject predicate* ?o
     * If graph is a variable, it will also be in those bindings
     * @param {Term} subject Term of where we start the predicate* search.
     * @param {Variable} object Variable of the zeroOrMore-query.
     * @param {Term} objectVal
     * @param {Algebra.PropertyPathSymbol} predicate Predicate of the *-path.
     * @param {Term} graph The graph in which we search for the pattern. (Possibly a variable)
     * @param {ActionContext} context
     * @return {Promise<AsyncIterator<Bindings>} Iterator to where all bindings of query should have been pushed.
     */
  public async getObjectsPredicateStarEval(subject: Term, object: Variable, predicate: Algebra.PropertyPathSymbol,
    graph: Term, context: ActionContext): Promise<AsyncIterator<Bindings>> {
    if (graph.termType === 'Variable') {
      return this.predicateStarGraphVariable(subject, object, predicate, graph, context);
    }

    const it = new BufferedIterator<Term>();
    await this.getObjectsPredicateStar(subject, predicate, graph, context, {}, it, { count: 0 });

    return it.transform<Bindings>({
      transform(item, next, push) {
        push(Bindings({ [termToString(object)]: item }));
        next();
      },
    });
  }

  /**
     * Pushes all terms to iterator `it` that are a solution of object predicate* ?o.
     * @param {Term} object Term of where we start the predicate* search.
     * @param {Algebra.PropertyPathSymbol} predicate Predicate of the *-path.
     * @param {Term} graph The graph in which we search for the pattern.
     * @param {ActionContext} context
     * @param {{[id: string]: Term}} termHashes Remembers the objects we've already searched for.
     * @param {BufferedIterator<Term>} it Iterator to push terms to.
     * @param {any} counter Counts how many searches are in progress to close it when needed (when counter == 0).
     * @return {Promise<void>} All solutions of query should have been pushed to it by then.
     */
  public async getObjectsPredicateStar(object: Term, predicate: Algebra.PropertyPathSymbol, graph: Term,
    context: ActionContext, termHashes: Record<string, Term>, it: BufferedIterator<Term>, counter: any): Promise<void> {
    const termString = termToString(object);
    if (termHashes[termString]) {
      return;
    }

    (<any> it)._push(object);
    termHashes[termString] = object;
    counter.count++;

    const thisVariable = this.generateVariable();
    const vString = termToString(thisVariable);
    const path = ActorAbstractPath.FACTORY.createPath(object, predicate, thisVariable, graph);
    const results = ActorQueryOperation.getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: path, context }),
    );
    results.bindingsStream.on('data', async bindings => {
      const result = bindings.get(vString);
      await this.getObjectsPredicateStar(result, predicate, graph, context, termHashes, it, counter);
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });
  }

  /**
     * Pushes all terms to iterator `it` that are a solution of ?s predicate* ?o.
     * @param {string} subjectString String representation of subjectVariable
     * @param {string} objectString String representation of objectVariable
     * @param {Term} subjectVal Term of where we start the predicate* search.
     * @param {Term} objectVal Found solution for an object, start for the new step.
     * @param {Algebra.PropertyPathSymbol} predicate Predicate of the *-path.
     * @param {Term} graph The graph in which we search for the pattern.
     * @param {ActionContext} context
     * @param {{[id: string]: Promise<Term[]>}} termHashesGlobal
     * Remembers solutions for when objectVal is already been calculated, can be reused when same objectVal occurs
     * @param {{[id: string]: Term}} termHashesCurrentSubject
     * Remembers the pairs we've already searched for, can stop searching if so.
     * @param {BufferedIterator<Bindings>} it Iterator to push terms to.
     * @param {any} counter Counts how many searches are in progress to close it when needed (when counter == 0).
     * @return {Promise<void>} All solutions of query should have been pushed to it by then.
     */
  // Let the iterator `it` emit all bindings of size 2, with subjectStringVariable as value subjectVal
  // and objectStringVariable as value all nodes reachable through predicate* beginning at objectVal
  public async getSubjectAndObjectBindingsPredicateStar(subjectString: string, objectString: string, subjectVal: Term,
    objectVal: Term, predicate: Algebra.PropertyPathSymbol, graph: Term, context: ActionContext,
    termHashesGlobal: Record<string, Promise<Term[]>>, termHashesCurrentSubject: Record<string, boolean>,
    it: BufferedIterator<Bindings>, counter: any): Promise<void> {
    const termString = termToString(objectVal) + termToString(graph);

    // If this combination of subject and object already done, return nothing
    if (termHashesCurrentSubject[termString]) {
      return;
    }

    counter.count++;
    termHashesCurrentSubject[termString] = true;
    (<any> it)._push(Bindings({ [subjectString]: subjectVal, [objectString]: objectVal }));

    // If every reachable node from object has already been calculated, use these for current subject too
    if (termString in termHashesGlobal) {
      const objects = await termHashesGlobal[termString];
      for (const object of objects) {
        await this.getSubjectAndObjectBindingsPredicateStar(
          subjectString,
          objectString,
          subjectVal,
          object,
          predicate,
          graph,
          context,
          termHashesGlobal,
          termHashesCurrentSubject,
          it,
          counter,
        );
      }
      if (--counter.count === 0) {
        it.close();
      }

      return;
    }

    // Construct promise to calculate all reachable nodes from this object
    const promise = new Promise<Term[]>(async(resolve, reject) => {
      const objectsArray: Term[] = [];

      // Construct path that leads us one step through predicate
      const thisVariable = this.generateVariable();
      const vString = termToString(thisVariable);
      const path = ActorAbstractPath.FACTORY.createPath(objectVal, predicate, thisVariable, graph);
      const results = ActorQueryOperation.getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: path, context }),
      );

      // Recursive call on all neighbours
      results.bindingsStream.on('data', async bindings => {
        const result = bindings.get(vString);
        objectsArray.push(result);
        await this.getSubjectAndObjectBindingsPredicateStar(
          subjectString,
          objectString,
          subjectVal,
          result,
          predicate,
          graph,
          context,
          termHashesGlobal,
          termHashesCurrentSubject,
          it,
          counter,
        );
      });
      results.bindingsStream.on('error', reject);
      results.bindingsStream.on('end', () => {
        if (--counter.count === 0) {
          it.close();
        }
        resolve(objectsArray);
      });
    });

    // Set it in the termHashesGlobal when this object occurs again they can wait for this promise
    termHashesGlobal[termString] = promise;
  }
}
