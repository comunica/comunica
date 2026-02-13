import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, algebraUtils, isKnownOperation } from '@comunica/utils-algebra';
import { doesShapeAcceptOperation } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';
import type { QuadTermName } from 'rdf-terms';

/**
 * A comunica Distinct Terms Optimize Query Operation Actor.
 *
 * This actor rewrites SELECT DISTINCT queries to use the DistinctTerms operator
 * when querying a single source that supports it.
 */
export class ActorOptimizeQueryOperationDistinctTerms extends ActorOptimizeQueryOperation {
  public async test(action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    // Only optimize if we're querying over a single source
    const querySources = action.context.get(KeysQueryOperation.querySources);
    if (!querySources || querySources.length !== 1) {
      return failTest('Only applies to single source queries');
    }

    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);
    const querySources = action.context.get(KeysQueryOperation.querySources)!;
    const source = querySources[0];
    const selectorShape = await source.source.getSelectorShape(action.context);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.PROJECT]: {
        preVisitor: () => ({ continue: false }),
        transform: (projectOp: Algebra.Project) => {
          // Check if the Project wraps a Distinct operation
          if (!isKnownOperation(projectOp.input, Algebra.Types.DISTINCT)) {
            return projectOp;
          }

          const distinctOp = projectOp.input;
          const innerOp = distinctOp.input;

          // Only optimize if the inner operation is a pattern
          if (!isKnownOperation(innerOp, Algebra.Types.PATTERN)) {
            return projectOp;
          }

          const pattern = innerOp;

          // Check if the projected variables can be mapped to quad terms
          const termsMapping = this.mapVariablesToTerms(projectOp.variables, pattern);
          if (!termsMapping) {
            return projectOp;
          }

          // Create the DistinctTerms operator (replaces the entire PROJECT(DISTINCT(PATTERN)))
          const distinctTermsOp = algebraFactory.createDistinctTerms(
            pattern,
            projectOp.variables,
            termsMapping,
          );

          // Check if the source supports this operation
          if (!doesShapeAcceptOperation(selectorShape, distinctTermsOp)) {
            return projectOp;
          }

          return distinctTermsOp;
        },
      },
    });

    return { operation, context: action.context };
  }

  /**
   * Map projected variables to quad term positions
   */
  private mapVariablesToTerms(
    variables: RDF.Variable[],
    pattern: Algebra.Pattern,
  ): Record<string, QuadTermName> | undefined {
    const termsMapping: Record<string, QuadTermName> = {};
    const termPositions: { term: RDF.Term; position: QuadTermName }[] = [
      { term: pattern.subject, position: 'subject' },
      { term: pattern.predicate, position: 'predicate' },
      { term: pattern.object, position: 'object' },
      { term: pattern.graph, position: 'graph' },
    ];

    // Map each projected variable to its position in the pattern
    for (const variable of variables) {
      let mapped = false;
      for (const { term, position } of termPositions) {
        if (term.termType === 'Variable' && term.equals(variable)) {
          termsMapping[variable.value] = position;
          mapped = true;
          break;
        }
      }
      // If a variable cannot be mapped, we cannot optimize
      if (!mapped) {
        return undefined;
      }
    }

    return termsMapping;
  }
}
