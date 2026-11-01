import { KeysInitQuery } from '@comunica/context-entries';
import type {
  Bindings,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  MetadataVariable,
} from '@comunica/types';
import type { Algebra } from '@comunica/utils-algebra';
import { AlgebraFactory, algebraUtils, Algebra as AlgebraTypes } from '@comunica/utils-algebra';
import { MetadataValidationState } from '@comunica/utils-metadata';
import { doesShapeAcceptOperation, getOperationSource, materializeTerm } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';

/**
 * Thrown when synchronous evaluation exceeds its budget, after which the regular join is used.
 */
class BudgetExceededError extends Error {}

/**
 * Prototype: evaluates a join of patterns over a single source with synchronous lookups,
 * as one nested loop over the source, without separate operations and join planning per pattern.
 */
export class SynchronousBgpEvaluator {
  /**
   * @param maxResults The maximum number of results, after which the regular join is used instead.
   * @param maxLookups The maximum number of lookups, after which the regular join is used instead.
   * @param maxStartCardinality The maximum cardinality of the first pattern, so that only selective joins are
   *                            evaluated eagerly. Larger joins, such as unbound inputs of bind joins, stay lazy.
   */
  public constructor(
    private readonly maxResults = 10_000,
    private readonly maxLookups = 10_000,
    private readonly maxStartCardinality = 1_000,
  ) {}

  /**
   * Evaluate the given join, or return undefined if it is not supported or too expensive.
   * @param operation A join operation.
   * @param context The action context.
   */
  public async evaluate(
    operation: Algebra.Join,
    context: IActionContext,
  ): Promise<IQueryOperationResultBindings | undefined> {
    const patterns = SynchronousBgpEvaluator.collectPatterns(operation);
    if (!patterns || patterns.length === 0) {
      return;
    }

    // All patterns must be looked up synchronously in the same source
    const sourceWrapper = getOperationSource(patterns[0]);
    if (!sourceWrapper?.source.queryBindingsSynchronous ||
      patterns.some(pattern => getOperationSource(pattern) !== sourceWrapper)) {
      return;
    }
    const shape = await sourceWrapper.source.getSelectorShape(context);
    if (!patterns.every(pattern => doesShapeAcceptOperation(shape, pattern, { synchronous: true }))) {
      return;
    }

    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const sourceContext = sourceWrapper.context ? context.merge(sourceWrapper.context) : context;
    const counts = new Map<Algebra.Pattern, number | undefined>();
    const count = (pattern: Algebra.Pattern): number | undefined => {
      if (!counts.has(pattern)) {
        counts.set(pattern, sourceWrapper.source.cardinalitySynchronous?.(pattern, sourceContext));
      }
      return counts.get(pattern);
    };
    const ordered = SynchronousBgpEvaluator.orderPatterns(patterns, count);
    if ((count(ordered[0]) ?? Number.POSITIVE_INFINITY) > this.maxStartCardinality) {
      return;
    }
    const results = this.evaluatePatterns(
      ordered,
      sourceWrapper,
      sourceContext,
      new AlgebraFactory(dataFactory),
    );
    if (!results) {
      return;
    }

    const variables: MetadataVariable[] = [];
    const seen = new Set<string>();
    for (const pattern of patterns) {
      for (const variable of algebraUtils.inScopeVariables(pattern)) {
        if (!seen.has(variable.value)) {
          seen.add(variable.value);
          variables.push({ variable, canBeUndef: false });
        }
      }
    }
    return {
      type: 'bindings',
      bindingsStream: new ArrayIterator<Bindings>(results, { autoStart: false }),
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: results.length },
        variables,
      }),
    };
  }

  /**
   * Collect the patterns of a (nested) join of patterns, or return undefined if it contains other operations.
   * @param operation An operation.
   */
  public static collectPatterns(operation: Algebra.Operation): Algebra.Pattern[] | undefined {
    if (algebraUtils.isKnownOperation(operation, AlgebraTypes.Types.PATTERN)) {
      const terms = [ operation.subject, operation.predicate, operation.object, operation.graph ];
      return terms.some(term => term.termType === 'Quad') ? undefined : [ operation ];
    }
    if (algebraUtils.isKnownOperation(operation, AlgebraTypes.Types.JOIN) && !('expression' in operation)) {
      const patterns: Algebra.Pattern[] = [];
      for (const input of operation.input) {
        const inner = SynchronousBgpEvaluator.collectPatterns(input);
        if (!inner) {
          return;
        }
        patterns.push(...inner);
      }
      return patterns;
    }
  }

  /**
   * Order patterns greedily, based on cardinalities that can be counted cheaply.
   * The first pattern is the one with the lowest cardinality.
   * Next, patterns that share a bound variable are preferred, with a bound subject first,
   * as their lookups are bound to the values of the previous patterns.
   * @param patterns Patterns.
   * @param count A function to count the matches of a pattern, if possible.
   */
  public static orderPatterns(
    patterns: Algebra.Pattern[],
    count: (pattern: Algebra.Pattern) => number | undefined,
  ): Algebra.Pattern[] {
    const remaining = [ ...patterns ];
    const ordered: Algebra.Pattern[] = [];
    const bound = new Set<string>();
    const isBound = (term: RDF.Term): boolean => term.termType !== 'Variable' || bound.has(term.value);
    // Only patterns with at least two constants can be counted without iterating over the store
    const estimates = new Map<Algebra.Pattern, number>();
    const estimate = (pattern: Algebra.Pattern): number => {
      let value = estimates.get(pattern);
      if (value === undefined) {
        const constants = [ pattern.subject, pattern.predicate, pattern.object ]
          .filter(term => term.termType !== 'Variable').length;
        value = (constants >= 2 ? count(pattern) : undefined) ?? Number.POSITIVE_INFINITY;
        estimates.set(pattern, value);
      }
      return value;
    };
    const constantScore = (pattern: Algebra.Pattern): number => (pattern.subject.termType === 'Variable' ? 0 : 4) +
      (pattern.object.termType === 'Variable' ? 0 : 2) + (pattern.predicate.termType === 'Variable' ? 0 : 1);
    const boundRank = (pattern: Algebra.Pattern): number => {
      if (isBound(pattern.subject)) {
        return 0;
      }
      return isBound(pattern.object) ? 1 : 2;
    };
    while (remaining.length > 0) {
      const connected = remaining.filter(pattern => algebraUtils.inScopeVariables(pattern)
        .some(variable => bound.has(variable.value)));
      const candidates = connected.length > 0 ? connected : remaining;
      let best = candidates[0];
      for (const candidate of candidates.slice(1)) {
        const order = connected.length > 0 ?
          boundRank(candidate) - boundRank(best) || estimate(candidate) - estimate(best) :
          estimate(candidate) - estimate(best);
        if (order < 0 || (order === 0 && constantScore(candidate) > constantScore(best))) {
          best = candidate;
        }
      }
      remaining.splice(remaining.indexOf(best), 1);
      ordered.push(best);
      for (const variable of algebraUtils.inScopeVariables(best)) {
        bound.add(variable.value);
      }
    }
    return ordered;
  }

  /**
   * Evaluate ordered patterns as a nested loop of synchronous lookups.
   * @param patterns Ordered patterns.
   * @param sourceWrapper The source of the patterns.
   * @param context The action context of the source.
   * @param algebraFactory An algebra factory.
   * @return The results, or undefined if the evaluation exceeded its budget.
   */
  protected evaluatePatterns(
    patterns: Algebra.Pattern[],
    sourceWrapper: IQuerySourceWrapper,
    context: IActionContext,
    algebraFactory: AlgebraFactory,
  ): Bindings[] | undefined {
    const results: Bindings[] = [];
    let lookups = 0;
    const lookup = (index: number, parent: Bindings | undefined): void => {
      if (++lookups > this.maxLookups) {
        throw new BudgetExceededError('Too many lookups');
      }
      const pattern = patterns[index];
      const bound = parent ?
        Object.assign(algebraFactory.createPattern(
          materializeTerm(pattern.subject, parent),
          materializeTerm(pattern.predicate, parent),
          materializeTerm(pattern.object, parent),
          materializeTerm(pattern.graph, parent),
        ), { metadata: pattern.metadata }) :
        pattern;
      const matches = sourceWrapper.source.queryBindingsSynchronous!(bound, context);
      if (!matches) {
        throw new BudgetExceededError('No synchronous lookup');
      }
      for (const match of matches) {
        const joined = parent ? match.merge(parent) : match;
        if (!joined) {
          continue;
        }
        if (index === patterns.length - 1) {
          results.push(joined);
          if (results.length > this.maxResults) {
            throw new BudgetExceededError('Too many results');
          }
        } else {
          lookup(index + 1, joined);
        }
      }
    };
    try {
      // eslint-disable-next-line unicorn/no-useless-undefined
      lookup(0, undefined);
    } catch (error: unknown) {
      if (error instanceof BudgetExceededError) {
        return;
      }
      throw error;
    }
    return results;
  }
}
