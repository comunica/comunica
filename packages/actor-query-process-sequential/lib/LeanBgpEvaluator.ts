import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type {
  BindingsStream,
  ComunicaDataFactory,
  IActionContext,
  IQueryOperationResultBindings,
  IQuerySourceWrapper,
  MetadataVariable,
} from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import { BindingsFactory } from '@comunica/utils-bindings-factory';
import { MetadataValidationState } from '@comunica/utils-metadata';
import type * as RDF from '@rdfjs/types';
import { ArrayIterator } from 'asynciterator';

/**
 * The symbol under which lean results expose their rows, for consumers that can serialize them directly.
 */
export const RAW_ROWS = Symbol.for('comunica.prototype.rawRows');

/**
 * A pattern of a lean plan, where the predicate is one of several alternatives.
 */
interface ILeanPattern {
  subject: RDF.Term;
  predicates: RDF.Term[];
  object: RDF.Term;
}

export interface IRawRows {
  variables: string[];
  rows: Record<string, RDF.Term>[];
}

/**
 * Thrown when lean evaluation exceeds its budget, after which the regular query process is used.
 */
class BudgetExceededError extends Error {}

/**
 * Prototype: evaluates simple SELECT queries over basic graph patterns on a single source with synchronous lookups,
 * without operation mediation, iterators, or bindings during evaluation.
 */
export class LeanBgpEvaluator {
  public constructor(
    private readonly maxResults = 10_000,
    private readonly maxLookups = 10_000,
    private readonly maxStartCardinality = 1_000,
  ) {}

  /**
   * Extract the projected variables and patterns of a project over basic graph patterns,
   * or return undefined if the operation has another shape.
   * @param operation An operation.
   */
  public static getPlan(operation: Algebra.Operation): { variables: RDF.Variable[]; patterns: ILeanPattern[] } |
    undefined {
    if (!algebraUtils.isKnownOperation(operation, Algebra.Types.PROJECT)) {
      return;
    }
    const patterns: ILeanPattern[] = [];
    const collect = (input: Algebra.Operation): boolean => {
      if (algebraUtils.isKnownOperation(input, Algebra.Types.BGP)) {
        return input.patterns.every(collect);
      }
      if (algebraUtils.isKnownOperation(input, Algebra.Types.JOIN)) {
        return !('expression' in input) && input.input.every(collect);
      }
      if (algebraUtils.isKnownOperation(input, Algebra.Types.PATTERN)) {
        if (input.graph.termType !== 'DefaultGraph' ||
          [ input.subject, input.predicate, input.object ].some(term => term.termType === 'Quad' ||
            term.termType === 'BlankNode')) {
          return false;
        }
        patterns.push({ subject: input.subject, predicates: [ input.predicate ], object: input.object });
        return true;
      }
      if (algebraUtils.isKnownOperation(input, Algebra.Types.PATH) && input.graph.termType === 'DefaultGraph') {
        const predicate = input.predicate;
        if (algebraUtils.isKnownOperation(predicate, Algebra.Types.LINK)) {
          patterns.push({ subject: input.subject, predicates: [ predicate.iri ], object: input.object });
          return true;
        }
        if (algebraUtils.isKnownOperation(predicate, Algebra.Types.ALT) &&
          predicate.input.every(link => algebraUtils.isKnownOperation(link, Algebra.Types.LINK))) {
          patterns.push({
            subject: input.subject,
            predicates: predicate.input.map(link => (link).iri),
            object: input.object,
          });
          return true;
        }
      }
      return false;
    };
    if (!collect(operation.input) || patterns.length === 0) {
      return;
    }
    return { variables: operation.variables, patterns };
  }

  /**
   * Evaluate the given query, or return undefined if it is not supported or too expensive.
   * @param operation A parsed operation.
   * @param context A context with identified query sources.
   */
  public evaluate(operation: Algebra.Operation, context: IActionContext): IQueryOperationResultBindings | undefined {
    const plan = LeanBgpEvaluator.getPlan(operation);
    const sources: IQuerySourceWrapper[] | undefined = context.get(KeysQueryOperation.querySources);
    if (!plan || sources?.length !== 1 || !sources[0].source.readQuadsSynchronous) {
      return;
    }
    const sourceWrapper = sources[0];
    const sourceContext = sourceWrapper.context ? context.merge(sourceWrapper.context) : context;
    const dataFactory: ComunicaDataFactory = context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const toPattern = (subject: RDF.Term, predicate: RDF.Term, object: RDF.Term): Algebra.Pattern =>
      algebraFactory.createPattern(subject, predicate, object, dataFactory.defaultGraph());

    // Order the patterns, starting from the one with the lowest cardinality
    const counts = new Map<ILeanPattern, number>();
    const count = (pattern: ILeanPattern): number => {
      let value = counts.get(pattern);
      if (value === undefined) {
        const constants = [ pattern.subject, pattern.predicates[0], pattern.object ]
          .filter(term => term.termType !== 'Variable').length;
        value = 0;
        for (const predicate of pattern.predicates) {
          const countPattern = toPattern(pattern.subject, predicate, pattern.object);
          const result = constants >= 2 ?
            sourceWrapper.source.cardinalitySynchronous?.(countPattern, sourceContext) :
            undefined;
          value += result ?? Number.POSITIVE_INFINITY;
        }
        counts.set(pattern, value);
      }
      return value;
    };
    const ordered = LeanBgpEvaluator.orderPatterns(plan.patterns, count);
    if (count(ordered[0]) > this.maxStartCardinality) {
      return;
    }

    // Evaluate as a nested loop over the source, with rows as plain objects
    const rows: Record<string, RDF.Term>[] = [];
    let lookups = 0;
    const row: Record<string, RDF.Term> = {};
    const bindTerm = (term: RDF.Term, value: RDF.Term, assigned: string[]): boolean => {
      if (term.termType !== 'Variable') {
        return true;
      }
      const existing = row[term.value];
      if (existing) {
        return existing.equals(value);
      }
      row[term.value] = value;
      assigned.push(term.value);
      return true;
    };
    const resolve = (term: RDF.Term): RDF.Term => term.termType === 'Variable' ? row[term.value] ?? term : term;
    const lookup = (index: number): void => {
      if (index === ordered.length) {
        const result: Record<string, RDF.Term> = {};
        for (const variable of plan.variables) {
          const value = row[variable.value];
          if (value) {
            result[variable.value] = value;
          }
        }
        rows.push(result);
        if (rows.length > this.maxResults) {
          throw new BudgetExceededError('Too many results');
        }
        return;
      }
      const pattern = ordered[index];
      const subject = resolve(pattern.subject);
      const object = resolve(pattern.object);
      for (const predicate of pattern.predicates) {
        if (++lookups > this.maxLookups) {
          throw new BudgetExceededError('Too many lookups');
        }
        const quads = sourceWrapper.source
          .readQuadsSynchronous!(toPattern(subject, resolve(predicate), object), sourceContext);
        if (!quads) {
          throw new BudgetExceededError('No synchronous lookup');
        }
        for (const quad of quads) {
          const assigned: string[] = [];
          if (bindTerm(subject, quad.subject, assigned) && bindTerm(predicate, quad.predicate, assigned) &&
            bindTerm(object, quad.object, assigned)) {
            lookup(index + 1);
          }
          for (const variable of assigned) {
            delete row[variable];
          }
        }
      }
    };
    try {
      lookup(0);
    } catch (error: unknown) {
      if (error instanceof BudgetExceededError) {
        return;
      }
      throw error;
    }

    const bindingsFactory = new BindingsFactory(dataFactory);
    const variables: MetadataVariable[] = plan.variables.map(variable => ({ variable, canBeUndef: false }));
    const result: IQueryOperationResultBindings = {
      type: 'bindings',
      bindingsStream: <BindingsStream> <unknown> new ArrayIterator(rows, { autoStart: false })
        .map(values => bindingsFactory.bindings(Object.entries(values)
          .map(([ key, value ]): [RDF.Variable, RDF.Term] => [ dataFactory.variable(key), value ]))),
      metadata: async() => ({
        state: new MetadataValidationState(),
        cardinality: { type: 'exact', value: rows.length },
        variables,
      }),
    };
    (<any> result)[RAW_ROWS] = <IRawRows> { variables: plan.variables.map(variable => variable.value), rows };
    return result;
  }

  /**
   * Order patterns greedily: start from the pattern with the lowest cardinality,
   * then prefer patterns that share a bound variable, with a bound subject first.
   */
  public static orderPatterns(patterns: ILeanPattern[], count: (pattern: ILeanPattern) => number): ILeanPattern[] {
    const remaining = [ ...patterns ];
    const ordered: ILeanPattern[] = [];
    const bound = new Set<string>();
    const isBound = (term: RDF.Term): boolean => term.termType !== 'Variable' || bound.has(term.value);
    const variablesOf = (pattern: ILeanPattern): string[] => [ pattern.subject, ...pattern.predicates, pattern.object ]
      .filter(term => term.termType === 'Variable').map(term => term.value);
    const boundRank = (pattern: ILeanPattern): number => {
      if (isBound(pattern.subject)) {
        return 0;
      }
      return isBound(pattern.object) ? 1 : 2;
    };
    while (remaining.length > 0) {
      const connected = remaining.filter(pattern => variablesOf(pattern).some(variable => bound.has(variable)));
      const candidates = connected.length > 0 ? connected : remaining;
      let best = candidates[0];
      for (const candidate of candidates.slice(1)) {
        const order = connected.length > 0 ?
          boundRank(candidate) - boundRank(best) || count(candidate) - count(best) :
          count(candidate) - count(best);
        if (order < 0) {
          best = candidate;
        }
      }
      remaining.splice(remaining.indexOf(best), 1);
      ordered.push(best);
      for (const variable of variablesOf(best)) {
        bound.add(variable);
      }
    }
    return ordered;
  }
}
