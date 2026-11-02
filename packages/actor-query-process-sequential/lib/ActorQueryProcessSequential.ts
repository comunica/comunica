import type { MediatorContextPreprocess } from '@comunica/bus-context-preprocess';
import type { MediatorMergeBindingsContext } from '@comunica/bus-merge-bindings-context';
import type {
  IActionOptimizeQueryOperation,
  MediatorOptimizeQueryOperation,
} from '@comunica/bus-optimize-query-operation';
import type { MediatorQueryOperation } from '@comunica/bus-query-operation';
import type { MediatorQueryParse } from '@comunica/bus-query-parse';
import type {
  IActionQueryProcess,
  IActorQueryProcessOutput,
  IActorQueryProcessArgs,
  IQueryProcessSequential,
  IQueryProcessSequentialOutput,
} from '@comunica/bus-query-process';
import {
  ActorQueryProcess,
} from '@comunica/bus-query-process';
import { KeysExpressionEvaluator, KeysInitQuery, KeysQueryOperation, KeysStatistics } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type {
  ComunicaDataFactory,
  IActionContext,
  IActionContextKey,
  IQueryOperationResult,
  IQuerySourceWrapper,
  ITermComparator,
  QuerySourceUnidentified,
  QueryFormatType,
} from '@comunica/types';
import { AlgebraFactory } from '@comunica/utils-algebra';
import type { Algebra } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { materializeOperation } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { LeanBgpEvaluator } from './LeanBgpEvaluator';
import { LeanEvaluator } from './LeanEvaluator';

/**
 * A comunica Sequential Query Process Actor.
 */
/**
 * Prototype: the optimizers that can apply to queries from the fast parser,
 * which are single SELECT queries without FROM, SERVICE, VALUES, subqueries, or updates.
 */
const LEAN_OPTIMIZERS = new Set([
  'query-source-identify',
  'query-source-skolemize',
  'assign-sources-exhaustive',
  'path-to-patterns',
  'join-bgp',
  'bgp-to-join',
  'prune-empty-source-operations',
  'filter-pushdown',
  'leftjoin-expression-pushdown',
  'sort-limit-pushdown',
  'annotate-union-order',
]);

export class ActorQueryProcessSequential extends ActorQueryProcess implements IQueryProcessSequential {
  public readonly mediatorContextPreprocess: MediatorContextPreprocess;
  public readonly mediatorQueryParse: MediatorQueryParse;
  public readonly mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  public readonly mediatorQueryOperation: MediatorQueryOperation;
  public readonly mediatorMergeBindingsContext: MediatorMergeBindingsContext;
  private readonly leanEvaluator = new LeanBgpEvaluator();
  private readonly leanAlgebraEvaluator = new LeanEvaluator();
  private readonly leanComparators = new WeakMap<object, Map<number, ITermComparator>>();
  private leanTermComparatorFactory: { mediate: (action: { context: IActionContext }) => Promise<ITermComparator> } |
    undefined;

  private leanSourceIdentifier: { run: (action: IActionOptimizeQueryOperation, sideData: undefined) => Promise<any> } |
    undefined;

  private leanOptimizers: { run: (action: IActionOptimizeQueryOperation, sideData: undefined) => Promise<any> }[] |
    undefined;

  public constructor(args: IActorQueryProcessSequentialArgs) {
    super(args);
    this.mediatorContextPreprocess = args.mediatorContextPreprocess;
    this.mediatorQueryParse = args.mediatorQueryParse;
    this.mediatorOptimizeQueryOperation = args.mediatorOptimizeQueryOperation;
    this.mediatorQueryOperation = args.mediatorQueryOperation;
    this.mediatorMergeBindingsContext = args.mediatorMergeBindingsContext;
  }

  public async test(action: IActionQueryProcess): Promise<TestResult<IActorTest>> {
    if (action.context.get(KeysInitQuery.explain)) {
      return failTest(`${this.name} is not able to explain queries.`);
    }
    return passTestVoid();
  }

  public async run(action: IActionQueryProcess): Promise<IActorQueryProcessOutput> {
    // Run all query processing steps in sequence
    let { operation, context } = await this.parse(action.query, action.context);

    // Prototype: evaluate selective queries without the regular pipeline
    const proto = (<any> globalThis).__proto;
    if (proto?.leanAlgebra && proto.noSkolem && (<any> operation)[Symbol.for('comunica.prototype.fastParsed')] &&
      LeanEvaluator.isSupported(operation)) {
      const identifiedContext = await this.leanIdentifySources(operation, context);
      let comparator: ITermComparator | undefined;
      if (LeanEvaluator.needsComparator(operation)) {
        comparator = await this.getLeanComparator(identifiedContext);
      }
      const result = this.leanAlgebraEvaluator.evaluate(operation, identifiedContext, comparator);
      if (result) {
        result.context = identifiedContext;
        return { result };
      }
    }
    if (proto?.leanBgp && proto.noSkolem && (<any> operation)[Symbol.for('comunica.prototype.fastParsed')] &&
      LeanBgpEvaluator.getPlan(operation)) {
      this.leanSourceIdentifier ??= (<any> this.mediatorOptimizeQueryOperation).bus.actors
        .find((actor: any) => actor.name.endsWith('#query-source-identify'));
      // eslint-disable-next-line unicorn/no-useless-undefined
      const identified = await this.leanSourceIdentifier!.run({ operation, context }, undefined);
      const result = this.leanEvaluator.evaluate(operation, identified.context);
      if (result) {
        result.context = identified.context;
        return { result };
      }
    }

    ({ operation, context } = await this.optimize(operation, context));
    const output = await this.evaluate(operation, context);

    return { result: output };
  }

  /**
   * Prototype: identify the query sources like the source identification actor,
   * without its handling of SERVICE clauses, which queries from the fast parser do not have.
   */
  public async leanIdentifySources(operation: Algebra.Operation, context: IActionContext): Promise<IActionContext> {
    this.leanSourceIdentifier ??= (<any> this.mediatorOptimizeQueryOperation).bus.actors
      .find((actor: any) => actor.name.endsWith('#query-source-identify'));
    const identifier = <any> this.leanSourceIdentifier!;
    const unidentified: QuerySourceUnidentified[] | undefined = context.get(KeysInitQuery.querySourcesUnidentified);
    if (!(<any> globalThis).__proto?.leanIdentify || !unidentified || context.has(KeysStatistics.dereferencedLinks) ||
      !identifier.identifySource) {
      // eslint-disable-next-line unicorn/no-useless-undefined
      return (await identifier.run({ operation, context }, undefined)).context;
    }
    const sources: IQuerySourceWrapper[] = await Promise.all(unidentified
      .map(async source => identifier.identifySource(await identifier.expandSource(source), context)));
    return context
      .delete(KeysInitQuery.querySourcesUnidentified)
      .set(KeysQueryOperation.querySources, sources);
  }

  /**
   * Prototype: get a term comparator for sorting, reused across queries when the context does not configure it.
   */
  public async getLeanComparator(context: IActionContext): Promise<ITermComparator | undefined> {
    this.leanTermComparatorFactory ??= (<any> this.mediatorQueryOperation).bus.actors
      .find((actor: any) => actor.mediatorTermComparatorFactory)?.mediatorTermComparatorFactory;
    // Comparisons only depend on these entries, and the implicit time zone of the query timestamp
    const configured = (<IActionContextKey<unknown>[]> [
      KeysInitQuery.extensionFunctions,
      KeysInitQuery.extensionFunctionCreator,
      KeysExpressionEvaluator.extensionFunctionCreator,
      KeysExpressionEvaluator.superTypeProvider,
      KeysExpressionEvaluator.defaultTimeZone,
      KeysExpressionEvaluator.nonLexicalComparison,
      KeysExpressionEvaluator.fullTermComparison,
    ]).some(key => context.has(key));
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const timestamp: Date | undefined = context.get(KeysInitQuery.queryTimestamp);
    if (configured || !timestamp) {
      return this.leanTermComparatorFactory?.mediate({ context });
    }
    // A new data factory is created per query by default, so comparators are cached per data factory class
    let comparators = this.leanComparators.get(dataFactory.constructor);
    if (!comparators) {
      comparators = new Map();
      this.leanComparators.set(dataFactory.constructor, comparators);
    }
    const key = timestamp.getTimezoneOffset();
    let comparator = comparators.get(key);
    if (!comparator) {
      comparator = await this.leanTermComparatorFactory?.mediate({ context });
      if (comparator) {
        comparators.set(key, comparator);
      }
    }
    return comparator;
  }

  public async parse(query: QueryFormatType, context: IActionContext): Promise<IQueryProcessSequentialOutput> {
    // Pre-processing the context
    context = (await this.mediatorContextPreprocess.mediate({ context, initialize: true })).context;

    // Parse query
    let operation: Algebra.Operation;
    if (typeof query === 'string') {
      // Save the original query string in the context
      context = context.set(KeysInitQuery.queryString, query);

      const baseIRI: string | undefined = context.get(KeysInitQuery.baseIRI);
      const queryFormat: RDF.QueryFormat = context.get(KeysInitQuery.queryFormat)!;
      const queryParseOutput = await this.mediatorQueryParse.mediate({ context, query, queryFormat, baseIRI });
      operation = queryParseOutput.operation;
      // Update the baseIRI in the context if the query modified it.
      if (queryParseOutput.baseIRI) {
        context = context.set(KeysInitQuery.baseIRI, queryParseOutput.baseIRI);
      }
    } else {
      operation = query;
    }

    // Apply initial bindings in context
    if (context.has(KeysInitQuery.initialBindings)) {
      const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
      const algebraFactory = new AlgebraFactory(dataFactory);
      const bindingsFactory = await BindingsFactory
        .create(this.mediatorMergeBindingsContext, context, dataFactory);
      operation = materializeOperation(
        operation,
        context.get(KeysInitQuery.initialBindings)!,
        algebraFactory,
        bindingsFactory,
        { strictTargetVariables: true },
      );

      // Delete the query string from the context, since our initial query might have changed
      // TODO: next/major - stop deleting the queryString, see KeysInitQuery.queryString.
      context = context.delete(KeysInitQuery.queryString);
    }

    return { operation, context };
  }

  public async optimize(operation: Algebra.Operation, context: IActionContext): Promise<IQueryProcessSequentialOutput> {
    // Open a scope that is unique to this query execution, for caches that must not outlive it
    context = context.set(KeysInitQuery.queryExecutionScope, {});

    // Save initial query in context
    context = context.set(KeysInitQuery.query, operation);

    // Prototype: queries from the fast parser only run the optimizers that can apply to them, without mediation
    if ((<any> globalThis).__proto?.leanOptimize && (<any> operation)[Symbol.for('comunica.prototype.fastParsed')]) {
      this.leanOptimizers ??= (<any> this.mediatorOptimizeQueryOperation).bus.actors
        .filter((actor: any) => LEAN_OPTIMIZERS.has(actor.name.slice(actor.name.indexOf('#') + 1)));
      let handle: IActionOptimizeQueryOperation = { context, operation };
      for (const actor of this.leanOptimizers!) {
        // eslint-disable-next-line unicorn/no-useless-undefined
        handle = { ...handle, ...await actor.run(handle, undefined) };
      }
      ({ operation, context } = handle);
    } else {
      ({ operation, context } = await this.mediatorOptimizeQueryOperation.mediate({ context, operation }));
    }

    // Save original query in context
    context = context.set(KeysInitQuery.query, operation);

    return { operation, context };
  }

  public async evaluate(operation: Algebra.Operation, context: IActionContext): Promise<IQueryOperationResult> {
    const output = await this.mediatorQueryOperation.mediate({ context, operation });
    output.context = context;
    return output;
  }
}

export interface IActorQueryProcessSequentialArgs extends IActorQueryProcessArgs {
  /**
   * The context processing combinator
   */
  mediatorContextPreprocess: MediatorContextPreprocess;
  /**
   * The query parse mediator
   */
  mediatorQueryParse: MediatorQueryParse;
  /**
   * The query operation optimize mediator
   */
  mediatorOptimizeQueryOperation: MediatorOptimizeQueryOperation;
  /**
   * The query operation mediator
   */
  mediatorQueryOperation: MediatorQueryOperation;
  /**
   * A mediator for creating binding context merge handlers
   */
  mediatorMergeBindingsContext: MediatorMergeBindingsContext;
}
