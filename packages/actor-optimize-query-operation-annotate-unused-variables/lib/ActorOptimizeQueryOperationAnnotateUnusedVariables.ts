import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * Occurrences of variables in an operation.
 */
interface IVariableOccurrences {
  /**
   * The number of occurrences per variable name.
   */
  counts: Map<string, number>;
  /**
   * The names of variables that occur in the subject, predicate, or object of a triple pattern.
   */
  inPatterns: Set<string>;
  /**
   * If a wildcard occurs, such as in COUNT(DISTINCT *), which refers to all variables.
   */
  wildcard: boolean;
}

/**
 * An optimize actor that annotates triple patterns with `unusedVariables`.
 * This is a metadata entry with the names of the variables in the subject, predicate, or object of a pattern
 * that occur nowhere else in the query, so that sources do not have to bind them.
 */
export class ActorOptimizeQueryOperationAnnotateUnusedVariables extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    if (!algebraUtils.hasOperationType(action.operation, [ Algebra.Types.PATTERN ])) {
      return { operation: action.operation, context: action.context };
    }
    const unused = ActorOptimizeQueryOperationAnnotateUnusedVariables.getUnusedVariables(action.operation);
    if (unused.size === 0) {
      return { operation: action.operation, context: action.context };
    }
    // Patterns of templates are not matched against sources
    const templates = { preVisitor: () => ({ ignoreKeys: new Set([ 'template', 'delete', 'insert' ]) }) };
    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.CONSTRUCT]: templates,
      [Algebra.Types.DELETE_INSERT]: templates,
      [Algebra.Types.PATTERN]: {
        transform: (pattern: Algebra.Pattern) => ActorOptimizeQueryOperationAnnotateUnusedVariables
          .annotate(pattern, unused),
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Determine the names of the variables that occur only once in an operation,
   * in the subject, predicate, or object of a triple pattern.
   * Any other occurrence counts, such as in a projection, an expression, or another pattern.
   * If the operation contains a wildcard, none are returned, since a wildcard refers to all variables.
   * @param operation An operation.
   * @return The names of the unused variables.
   */
  public static getUnusedVariables(operation: Algebra.Operation): Set<string> {
    const occurrences: IVariableOccurrences = { counts: new Map(), inPatterns: new Set(), wildcard: false };
    ActorOptimizeQueryOperationAnnotateUnusedVariables.countVariables(operation, occurrences);
    const unused = new Set<string>();
    if (!occurrences.wildcard) {
      for (const variable of occurrences.inPatterns) {
        if (occurrences.counts.get(variable) === 1) {
          unused.add(variable);
        }
      }
    }
    return unused;
  }

  /**
   * Count the occurrences of variables in any value within an operation, which does not descend into metadata.
   * @param value A value within an operation.
   * @param occurrences The occurrences, which are updated.
   */
  protected static countVariables(value: unknown, occurrences: IVariableOccurrences): void {
    if (Array.isArray(value)) {
      for (const element of value) {
        ActorOptimizeQueryOperationAnnotateUnusedVariables.countVariables(element, occurrences);
      }
      return;
    }
    if (value === null || typeof value !== 'object') {
      return;
    }
    const object = <Record<string, unknown>> value;
    if (object.type === Algebra.Types.PATTERN) {
      const pattern = <Algebra.Pattern> <unknown> object;
      for (const term of [ pattern.subject, pattern.predicate, pattern.object ]) {
        ActorOptimizeQueryOperationAnnotateUnusedVariables.countTerm(term, true, occurrences);
      }
      ActorOptimizeQueryOperationAnnotateUnusedVariables.countTerm(pattern.graph, false, occurrences);
      return;
    }
    if (typeof object.termType === 'string') {
      ActorOptimizeQueryOperationAnnotateUnusedVariables.countTerm(<RDF.Term> <unknown> object, false, occurrences);
      return;
    }
    if (object.type === Algebra.Types.EXPRESSION && object.subType === Algebra.ExpressionTypes.WILDCARD) {
      occurrences.wildcard = true;
      return;
    }
    for (const [ key, child ] of Object.entries(object)) {
      // Metadata is not part of the query, and can contain cycles
      if (key !== 'metadata') {
        ActorOptimizeQueryOperationAnnotateUnusedVariables.countVariables(child, occurrences);
      }
    }
  }

  /**
   * Count the variables in a term.
   * @param term A term.
   * @param inPattern If the term is the subject, predicate, or object of a triple pattern.
   * @param occurrences The occurrences, which are updated.
   */
  protected static countTerm(term: RDF.Term, inPattern: boolean, occurrences: IVariableOccurrences): void {
    if (term.termType === 'Variable') {
      occurrences.counts.set(term.value, (occurrences.counts.get(term.value) ?? 0) + 1);
      if (inPattern) {
        occurrences.inPatterns.add(term.value);
      }
    } else if (term.termType === 'Quad') {
      // Variables in quoted triples are not bound by the pattern itself
      for (const nested of [ term.subject, term.predicate, term.object, term.graph ]) {
        ActorOptimizeQueryOperationAnnotateUnusedVariables.countTerm(nested, false, occurrences);
      }
    }
  }

  /**
   * Annotate a pattern with the names of its unused variables, if it has any.
   * @param pattern A triple pattern.
   * @param unused The names of the unused variables of the query.
   * @return The pattern, with its unused variables in its metadata.
   */
  public static annotate(pattern: Algebra.Pattern, unused: Set<string>): Algebra.Pattern {
    const unusedVariables = [ pattern.subject, pattern.predicate, pattern.object ]
      .filter(term => term.termType === 'Variable' && unused.has(term.value))
      .map(term => term.value);
    if (unusedVariables.length === 0) {
      return pattern;
    }
    return { ...pattern, metadata: { ...pattern.metadata, unusedVariables }};
  }
}
