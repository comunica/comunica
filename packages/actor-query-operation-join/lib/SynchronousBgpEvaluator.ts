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
   */
  public constructor(
    private readonly maxResults = 10_000,
    private readonly maxLookups = 50_000,
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
    const results = this.evaluatePatterns(
      SynchronousBgpEvaluator.orderPatterns(patterns),
      sourceWrapper,
      sourceWrapper.context ? context.merge(sourceWrapper.context) : context,
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
   * Order patterns greedily: start from the most selective pattern,
   * and then continue with patterns that share the most bound variables.
   * @param patterns Patterns.
   */
  public static orderPatterns(patterns: Algebra.Pattern[]): Algebra.Pattern[] {
    const remaining = [ ...patterns ];
    const ordered: Algebra.Pattern[] = [];
    const bound = new Set<string>();
    const score = (pattern: Algebra.Pattern): number => {
      const weight = (term: RDF.Term, constant: number): number => {
        if (term.termType === 'Variable') {
          return bound.has(term.value) ? constant - 1 : 0;
        }
        return constant;
      };
      return weight(pattern.subject, 8) + weight(pattern.object, 4) + weight(pattern.predicate, 2);
    };
    while (remaining.length > 0) {
      let best = 0;
      for (let i = 1; i < remaining.length; i++) {
        if (score(remaining[i]) > score(remaining[best])) {
          best = i;
        }
      }
      const [ next ] = remaining.splice(best, 1);
      ordered.push(next);
      for (const variable of algebraUtils.inScopeVariables(next)) {
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
