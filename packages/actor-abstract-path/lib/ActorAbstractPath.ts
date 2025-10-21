import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import { KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  IQueryOperationResultBindings,
  Bindings,
  IActionContext,
  MetadataBindings,
  IQuerySourceWrapper,
  ComunicaDataFactory,
} from '@comunica/types';
import { Algebra, isKnownOperation } from '@comunica/utils-algebra';
import type { AlgebraFactory } from '@comunica/utils-algebra';
import type { BindingsFactory } from '@comunica/utils-bindings-factory';
import { assignOperationSource, getOperationSource, getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { AsyncIterator } from 'asynciterator';
import {
  BufferedIterator,
  MultiTransformIterator,
  TransformIterator,
  EmptyIterator,
} from 'asynciterator';
import { termToString } from 'rdf-string';
import { PathVariableObjectIterator } from './PathVariableObjectIterator';

/**
 * An abstract actor that handles Path operations.
 *
 * Provides multiple helper functions used by the Path operation actors.
 */
export abstract class ActorAbstractPath extends ActorQueryOperationTypedMediated<Algebra.Path> {
  protected readonly predicateType: string;

  protected constructor(args: IActorQueryOperationTypedMediatedArgs, predicateType: string) {
    super(args, 'path');
    this.predicateType = predicateType;
  }

  public async testOperation(operation: Algebra.Path, _context: IActionContext): Promise<TestResult<IActorTest>> {
    if (operation.predicate.type !== this.predicateType) {
      return failTest(`This Actor only supports ${this.predicateType} Path operations.`);
    }

    return passTestVoid();
  }

  // Generates a variable that does not yet occur in the path
  public generateVariable(dataFactory: ComunicaDataFactory, path?: Algebra.Path, name?: string): RDF.Variable {
    if (!name) {
      return this.generateVariable(dataFactory, path, 'b');
    }

    // Path predicates can't contain variables
    if (path && (path.subject.value === name || path.object.value === name)) {
      return this.generateVariable(dataFactory, path, `${name}b`);
    }

    return dataFactory.variable(name);
  }

  // Such connectivity matching does not introduce duplicates (it does not incorporate any count of the number
  // of ways the connection can be made) even if the repeated path itself would otherwise result in duplicates.
  // https://www.w3.org/TR/sparql11-query/#propertypaths
  public async isPathArbitraryLengthDistinct(
    algebraFactory: AlgebraFactory,
    context: IActionContext,
    path: Algebra.Path,
  ): Promise<{ context: IActionContext; operation: IQueryOperationResultBindings | undefined }> {
    if (!context.get(KeysQueryOperation.isPathArbitraryLengthDistinctKey)) {
      context = context.set(KeysQueryOperation.isPathArbitraryLengthDistinctKey, true);
      return { context, operation: getSafeBindings(await this.mediatorQueryOperation.mediate({
        operation: algebraFactory.createDistinct(path),
        context,
      })) };
    }

    context = context.set(KeysQueryOperation.isPathArbitraryLengthDistinctKey, false);
    return { context, operation: undefined };
  }

  private async predicateStarGraphVariable(
    subject: RDF.Term,
    object: RDF.Variable,
    predicate: Algebra.Operation,
    graph: RDF.Variable,
    context: IActionContext,
    algebraFactory: AlgebraFactory,
    bindingsFactory: BindingsFactory,
  ): Promise<IPathResultStream> {
    const sources = this.getPathSources(predicate);
    // TODO: refactor this with an iterator just like PathVariableObjectIterator so we handle backpressure correctly
    // Construct path to obtain all graphs where subject exists
    const predVar = this.generateVariable(<ComunicaDataFactory> algebraFactory.dataFactory, algebraFactory
      .createPath(subject, predicate, object, graph));
    const findGraphs = algebraFactory.createUnion([
      this.assignPatternSources(algebraFactory, algebraFactory.createPattern(subject, predVar, object, graph), sources),
      this.assignPatternSources(algebraFactory, algebraFactory.createPattern(object, predVar, subject, graph), sources),
    ]);
    const results = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ context, operation: findGraphs }),
    );

    const passedGraphs: Set<string> = new Set();

    const bindingsStream = new MultiTransformIterator<Bindings, Bindings>(
      results.bindingsStream,
      {
        multiTransform: (bindings: Bindings) => {
          // Extract the graph and start a predicate* search starting from subject in each graph
          const graphValue: RDF.Term = bindings.get(graph)!;
          if (passedGraphs.has(graphValue.value)) {
            return new EmptyIterator();
          }
          passedGraphs.add(graphValue.value);
          return new TransformIterator<Bindings>(
            async() => {
              const it = new BufferedIterator<RDF.Term>();
              await this
                .getObjectsPredicateStar(algebraFactory, subject, predicate, graphValue, context, {}, it, { count: 0 });
              return it.map<Bindings>(item => bindingsFactory.bindings([
                [ object, item ],
                [ graph, graphValue ],
              ]));
            },
            { maxBufferSize: 128 },
          );
        },
        autoStart: false,
      },
    );

    return {
      bindingsStream,
      metadata: results.metadata,
    };
  }

  /**
   * Returns an iterator with Bindings of the query subject predicate* ?o or subject predicate+ ?o
   * If graph is a variable, it will also be in those bindings
   * @param {Term} subject Term of where we start the predicate* search.
   * @param {Algebra.PropertyPathSymbol} predicate Predicate of the *-path.
   * @param {Variable} object Variable of the zeroOrMore-query.
   * @param {Term} graph The graph in which we search for the pattern. (Possibly a variable)
   * @param {ActionContext} context The context to pass to sub-opertations
   * @param emitFirstSubject If the path operation is predicate*, otherwise it is predicate+.
   * @param algebraFactory The algebra factory.
   * @param bindingsFactory The data factory.
   * @return {Promise<AsyncIterator<Bindings>} Iterator to where all bindings of query should have been pushed.
   */
  public async getObjectsPredicateStarEval(
    subject: RDF.Term,
    predicate: Algebra.Operation,
    object: RDF.Variable,
    graph: RDF.Term,
    context: IActionContext,
    emitFirstSubject: boolean,
    algebraFactory: AlgebraFactory,
    bindingsFactory: BindingsFactory,
  ): Promise<IPathResultStream> {
    if (graph.termType === 'Variable') {
      return this
        .predicateStarGraphVariable(subject, object, predicate, graph, context, algebraFactory, bindingsFactory);
    }

    const it = new PathVariableObjectIterator(
      algebraFactory,
      subject,
      predicate,
      graph,
      context,
      this.mediatorQueryOperation,
      emitFirstSubject,
    );

    const bindingsStream = it.map<Bindings>(item => bindingsFactory.bindings([[ object, item ]]));

    return {
      bindingsStream,
      async metadata() {
        const metadata: MetadataBindings = await new Promise((resolve) => {
          it.getProperty('metadata', (metadataInner: any) => resolve(metadataInner()));
        });
        // Increment cardinality by one, because we always have at least one result once we reach this stage.
        // See the transformation above where we push a single binding.
        metadata.cardinality.value++;
        return metadata;
      },
    };
  }

  /**
   * Pushes all terms to iterator `it` that are a solution of object predicate* ?o.
   * @param algebraFactory The algebra factory.
   * @param {Term} object Term of where we start the predicate* search.
   * @param {Algebra.PropertyPathSymbol} predicate Predicate of the *-path.
   * @param {Term} graph The graph in which we search for the pattern.
   * @param {ActionContext} context
   * @param {Record<string, Term>} termHashes Remembers the objects we've already searched for.
   * @param {BufferedIterator<Term>} it Iterator to push terms to.
   * @param {any} counter Counts how many searches are in progress to close it when needed (when counter == 0).
   * @return {Promise<IPathResultStream['metadata']>} The results metadata.
   */
  public async getObjectsPredicateStar(
    algebraFactory: AlgebraFactory,
    object: RDF.Term,
    predicate: Algebra.Operation,
    graph: RDF.Term,
    context: IActionContext,
    termHashes: Record<string, RDF.Term>,
    it: BufferedIterator<RDF.Term>,
    counter: any,
  ): Promise<IPathResultStream['metadata'] | undefined> {
    const termString = termToString(object);
    if (termHashes[termString]) {
      return;
    }

    (<any> it)._push(object);
    termHashes[termString] = object;
    counter.count++;

    const thisVariable = this.generateVariable(<ComunicaDataFactory> algebraFactory.dataFactory);
    const path = algebraFactory.createPath(object, predicate, thisVariable, graph);
    const results = getSafeBindings(
      await this.mediatorQueryOperation.mediate({ operation: path, context }),
    );

    // TODO: fixme
    // eslint-disable-next-line ts/no-misused-promises
    results.bindingsStream.on('data', async(bindings: Bindings) => {
      const result = bindings.get(thisVariable);
      await this.getObjectsPredicateStar(algebraFactory, result!, predicate, graph, context, termHashes, it, counter);
    });
    results.bindingsStream.on('end', () => {
      if (--counter.count === 0) {
        it.close();
      }
    });

    return results.metadata;
  }

  /**
   * Pushes all terms to iterator `it` that are a solution of ?s predicate* ?o.
   * @param {string} subjectVar String representation of subjectVariable
   * @param {string} objectVar String representation of objectVariable
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
   * @param algebraFactory The algebra factory.
   * @param bindingsFactory The bindings factory.
   * @return {Promise<void>} All solutions of query should have been pushed to it by then.
   */
  // Let the iterator `it` emit all bindings of size 2, with subjectStringVariable as value subjectVal
  // and objectStringVariable as value all nodes reachable through predicate* beginning at objectVal
  public async getSubjectAndObjectBindingsPredicateStar(
    subjectVar: RDF.Variable,
    objectVar: RDF.Variable,
    subjectVal: RDF.Term,
    objectVal: RDF.Term,
    predicate: Algebra.Operation,
    graph: RDF.Term,
    context: IActionContext,
    termHashesGlobal: Record<string, Promise<RDF.Term[]>>,
    termHashesCurrentSubject: Record<string, boolean>,
    it: BufferedIterator<Bindings>,
    counter: any,
    algebraFactory: AlgebraFactory,
    bindingsFactory: BindingsFactory,
  ): Promise<void> {
    const termString = termToString(objectVal) + termToString(graph);

    // If this combination of subject and object already done, return nothing
    if (termHashesCurrentSubject[termString]) {
      return;
    }

    counter.count++;
    termHashesCurrentSubject[termString] = true;
    (<any> it)._push(bindingsFactory.bindings([
      [ subjectVar, subjectVal ],
      [ objectVar, objectVal ],
    ]));

    // If every reachable node from object has already been calculated, use these for current subject too
    if (termString in termHashesGlobal) {
      const objects = await termHashesGlobal[termString];
      for (const object of objects) {
        await this.getSubjectAndObjectBindingsPredicateStar(
          subjectVar,
          objectVar,
          subjectVal,
          object,
          predicate,
          graph,
          context,
          termHashesGlobal,
          termHashesCurrentSubject,
          it,
          counter,
          algebraFactory,
          bindingsFactory,
        );
      }
      if (--counter.count === 0) {
        it.close();
      }

      return;
    }

    // Construct promise to calculate all reachable nodes from this object
    // TODO: fixme
    // eslint-disable-next-line no-async-promise-executor,ts/no-misused-promises
    const promise = new Promise<RDF.Term[]>(async(resolve, reject) => {
      const objectsArray: RDF.Term[] = [];

      // Construct path that leads us one step through predicate
      const thisVariable = this.generateVariable(<ComunicaDataFactory> algebraFactory.dataFactory);
      const path = algebraFactory.createPath(objectVal, predicate, thisVariable, graph);
      const results = getSafeBindings(
        await this.mediatorQueryOperation.mediate({ operation: path, context }),
      );

      // Recursive call on all neighbours
      // TODO: fixme
      // eslint-disable-next-line ts/no-misused-promises
      results.bindingsStream.on('data', async(bindings: RDF.Bindings) => {
        const result: RDF.Term = bindings.get(thisVariable)!;
        objectsArray.push(result);
        await this.getSubjectAndObjectBindingsPredicateStar(
          subjectVar,
          objectVar,
          subjectVal,
          result,
          predicate,
          graph,
          context,
          termHashesGlobal,
          termHashesCurrentSubject,
          it,
          counter,
          algebraFactory,
          bindingsFactory,
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

  /**
   * Find all sources recursively contained in the given path operation.
   * @param operation
   */
  public getPathSources(operation: Algebra.Operation): IQuerySourceWrapper[] {
    if (isKnownOperation(operation, Algebra.Types.ALT) || isKnownOperation(operation, Algebra.Types.SEQ)) {
      return operation.input.flatMap(subOp => this.getPathSources(subOp));
    }
    if (isKnownOperation(operation, Algebra.Types.INV) || isKnownOperation(operation, Algebra.Types.ONE_OR_MORE_PATH) ||
      isKnownOperation(operation, Algebra.Types.ZERO_OR_MORE_PATH) ||
      isKnownOperation(operation, Algebra.Types.ZERO_OR_ONE_PATH)) {
      return this.getPathSources(operation.path);
    }
    if (isKnownOperation(operation, Algebra.Types.LINK) || isKnownOperation(operation, Algebra.Types.NPS)) {
      const source = getOperationSource(operation);
      if (!source) {
        throw new Error(`Could not find a required source on a link path operation`);
      }
      return [ source ];
    }
    throw new Error(`Can not extract path sources from operation of type ${operation.type}`);
  }

  public assignPatternSources(
    algebraFactory: AlgebraFactory,
    pattern: Algebra.Pattern,
    sources: IQuerySourceWrapper[],
  ): Algebra.Operation {
    if (sources.length === 0) {
      throw new Error(`Attempted to assign zero sources to a pattern during property path handling`);
    }
    if (sources.length === 1) {
      return assignOperationSource(pattern, sources[0]);
    }
    return algebraFactory.createUnion(sources
      .map(source => assignOperationSource(pattern, source)), true);
  }
}

export interface IPathResultStream {
  bindingsStream: AsyncIterator<Bindings>;
  metadata: () => Promise<MetadataBindings>;
}
