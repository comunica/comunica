import type {
  IActionRdfJoinEntriesSort,
  IActorRdfJoinEntriesSortArgs,
  IActorRdfJoinEntriesSortOutput,
  IActorRdfJoinEntriesSortTest,
} from '@comunica/bus-rdf-join-entries-sort';
import { ActorRdfJoinEntriesSort } from '@comunica/bus-rdf-join-entries-sort';
import type { TestResult } from '@comunica/core';
import { failTest, passTest } from '@comunica/core';
import type { IJoinEntryWithMetadata, IQuerySource } from '@comunica/types';
import { Algebra, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';
import { getOperationSource } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * An RDF Join Entries Sort actor for entries over sources of which the cardinalities are unknown.
 *
 * Following the join ordering of FedX (Schwarte et al., ISWC 2011), it orders the entries greedily,
 * each time picking the entry that is cheapest given the variables that the earlier entries bind.
 * Entries are compared by, in order:
 * 1. Whether they have variables in common with the earlier entries, as other entries lead to cross products.
 * 2. The lowest cost among their patterns with the variable counting heuristic (Stocker et al., WWW 2008),
 *    in which bound variables count as constants, as an entry can be evaluated from its most selective pattern.
 * 3. Whether all their patterns have the same subject, as the results of such a star are bounded by its most
 *    selective pattern, while joins over objects can multiply results.
 * 4. The number of sources that evaluate them, as each source is sent a request.
 * 5. The number of their patterns, as more patterns restrict the results further.
 * 6. Their cardinality, if it is known.
 *
 * It applies to entries over multiple sources if a cardinality is unknown,
 * as the cardinality-based sort places such entries last, however selective they are.
 */
export class ActorRdfJoinEntriesSortFreeVariables extends ActorRdfJoinEntriesSort {
  public constructor(args: IActorRdfJoinEntriesSortArgs) {
    super(args);
  }

  public async test(action: IActionRdfJoinEntriesSort): Promise<TestResult<IActorRdfJoinEntriesSortTest>> {
    // With a single source, e.g., a local file, the existing sorts apply as before.
    const sources = new Set<IQuerySource>();
    for (const entry of action.entries) {
      ActorRdfJoinEntriesSortFreeVariables.addSources(entry.operation, sources);
    }
    if (sources.size < 2) {
      return failTest(`Actor ${this.name} can only sort entries of which operations are assigned to multiple sources`);
    }
    // The cardinality-based sort would place entries with an unknown cardinality last, however selective they are.
    if (action.entries.every(entry => Number.isFinite(entry.metadata.cardinality.value))) {
      return failTest(`Actor ${this.name} can only sort entries of which a cardinality is unknown`);
    }
    return passTest({ accuracy: 1 });
  }

  public async run(action: IActionRdfJoinEntriesSort): Promise<IActorRdfJoinEntriesSortOutput> {
    // Entries of which the operation was already evaluated come first, and bind their variables.
    const sortedEntries: IJoinEntryWithMetadata[] = action.entries.filter(entry => entry.operationModified);
    const remainingEntries = action.entries.filter(entry => !entry.operationModified);
    const boundVariables = new Set<string>();
    for (const entry of sortedEntries) {
      ActorRdfJoinEntriesSortFreeVariables.addVariables(entry.operation, boundVariables);
    }

    while (remainingEntries.length > 0) {
      let minIndex = 0;
      let minCost: number[] | undefined;
      for (const [ index, entry ] of remainingEntries.entries()) {
        const cost = [
          ...ActorRdfJoinEntriesSortFreeVariables.estimateCost(entry.operation, boundVariables),
          entry.metadata.cardinality.value,
        ];
        if (!minCost || ActorRdfJoinEntriesSortFreeVariables.compareCosts(cost, minCost) < 0) {
          minIndex = index;
          minCost = cost;
        }
      }
      const entry = remainingEntries.splice(minIndex, 1)[0];
      sortedEntries.push(entry);
      ActorRdfJoinEntriesSortFreeVariables.addVariables(entry.operation, boundVariables);
    }

    return { entries: sortedEntries };
  }

  /**
   * Add the sources that the given operation, or the inputs of the given union, are assigned to.
   * @param operation An operation.
   * @param sources The sources to add to.
   */
  public static addSources(operation: Algebra.Operation, sources: Set<IQuerySource>): void {
    const source = getOperationSource(operation);
    if (source) {
      sources.add(source.source);
    } else if (isKnownOperation(operation, Algebra.Types.UNION)) {
      for (const input of operation.input) {
        ActorRdfJoinEntriesSortFreeVariables.addSources(input, sources);
      }
    }
  }

  /**
   * Compare two costs lexicographically.
   * @param costA A cost.
   * @param costB A cost.
   * @return A negative number if costA is lower, a positive number if it is higher, or 0 if they are equal.
   */
  public static compareCosts(costA: number[], costB: number[]): number {
    for (const [ index, value ] of costA.entries()) {
      if (value !== costB[index]) {
        return value - costB[index];
      }
    }
    return 0;
  }

  /**
   * Estimate the cost of evaluating the given operation after operations that bound the given variables,
   * as a tuple that must be compared lexicographically.
   * @param operation An operation.
   * @param boundVariables The variables bound by earlier operations.
   */
  public static estimateCost(operation: Algebra.Operation, boundVariables: Set<string>): number[] {
    const variables = ActorRdfJoinEntriesSortFreeVariables.getVariables(operation);
    const disconnected = boundVariables.size > 0 && !variables.some(variable => boundVariables.has(variable));
    let patternsOperation = operation;
    let sources = 1;
    if (!getOperationSource(operation) && isKnownOperation(operation, Algebra.Types.UNION) &&
      ActorRdfJoinEntriesSortFreeVariables.isSameOperationOverSources(operation)) {
      patternsOperation = operation.input[0];
      sources = operation.input.length;
    }
    const patterns = ActorRdfJoinEntriesSortFreeVariables.getPatterns(patternsOperation);
    const patternCost = Math.min(...patterns
      .map(pattern => ActorRdfJoinEntriesSortFreeVariables.getPatternCost(pattern, boundVariables)));
    const star = patterns.every(pattern => pattern.subject.equals(patterns[0].subject));
    return [
      disconnected ? 1 : 0,
      isKnownOperation(operation, Algebra.Types.VALUES) ? 0 : Math.min(patternCost, 1),
      star ? 0 : 1,
      sources,
      0 - patterns.length,
    ];
  }

  /**
   * Check if all inputs of the given union are the same operation, each assigned to a source.
   * @param union A union operation.
   */
  public static isSameOperationOverSources(union: Algebra.Union): boolean {
    if (union.input.length === 0 || !union.input.every(input => getOperationSource(input))) {
      return false;
    }
    const first = ActorRdfJoinEntriesSortFreeVariables.serializeWithoutMetadata(union.input[0]);
    return union.input.every(input => ActorRdfJoinEntriesSortFreeVariables.serializeWithoutMetadata(input) === first);
  }

  public static serializeWithoutMetadata(operation: Algebra.Operation): string {
    return JSON.stringify(operation, (key, value) => key === 'metadata' ? undefined : value);
  }

  /**
   * Get all patterns and paths in the given operation.
   * @param operation An operation.
   */
  public static getPatterns(operation: Algebra.Operation): (Algebra.Pattern | Algebra.Path)[] {
    const patterns: (Algebra.Pattern | Algebra.Path)[] = [];
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.PATTERN]: { preVisitor: (pattern) => {
        patterns.push(pattern);
        return { continue: false };
      } },
      [Algebra.Types.PATH]: { preVisitor: (path) => {
        patterns.push(path);
        return { continue: false };
      } },
    });
    return patterns;
  }

  /**
   * Determine the cost of a pattern with the weights of the variable counting heuristic,
   * in which variables that are bound count as constants.
   * @param pattern A pattern or path.
   * @param boundVariables The variables bound by earlier operations.
   */
  public static getPatternCost(pattern: Algebra.Pattern | Algebra.Path, boundVariables: Set<string>): number {
    const isFree = (term: RDF.Term): boolean => term.termType === 'Variable' && !boundVariables.has(term.value);
    let cost = 1;
    if (isFree(pattern.subject)) {
      cost += 4;
    }
    if (pattern.type === Algebra.Types.PATH || isFree(pattern.predicate)) {
      cost += 1;
    }
    if (isFree(pattern.object)) {
      cost += 2;
    }
    if (isFree(pattern.graph)) {
      cost += 1;
    }
    return cost / 9;
  }

  public static getVariables(operation: Algebra.Operation): string[] {
    return algebraUtils.inScopeVariables(operation).map(variable => variable.value);
  }

  public static addVariables(operation: Algebra.Operation, variables: Set<string>): void {
    for (const variable of ActorRdfJoinEntriesSortFreeVariables.getVariables(operation)) {
      variables.add(variable);
    }
  }
}
