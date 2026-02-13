import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery, KeysQueryOperation } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, algebraUtils, isKnownOperation, TypesComunica } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

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

    // Check if the source supports DistinctTerms
    const source = querySources[0];
    const selectorShape = await source.source.getSelectorShape(action.context);
    if (!this.supportsDistinctTerms(selectorShape)) {
      return failTest('Source does not support DistinctTerms operator');
    }

    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

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

          // Try to extract a pattern that can be optimized
          const patternInfo = this.extractPattern(innerOp);
          if (!patternInfo) {
            return projectOp;
          }

          // Check if the projected variables can be mapped to quad terms
          const termsMapping = this.mapVariablesToTerms(projectOp.variables, patternInfo.pattern);
          if (!termsMapping) {
            return projectOp;
          }

          // Create the DistinctTerms operator
          const distinctTermsOp = algebraFactory.createDistinctTerms(
            patternInfo.pattern,
            projectOp.variables,
            termsMapping,
          );

          // Wrap in any outer operations that were removed (like Graph)
          let resultOp: Algebra.Operation = distinctTermsOp;
          if (patternInfo.graphTerm) {
            // CreateGraph expects a Variable or NamedNode, not DefaultGraph
            // If it's a graph operation, the term should be one of these
            resultOp = algebraFactory.createGraph(
              resultOp,
              <RDF.Variable | RDF.NamedNode> patternInfo.graphTerm,
            );
          }

          return algebraFactory.createProject(resultOp, projectOp.variables);
        },
      },
    });

    return { operation, context: action.context };
  }

  /**
   * Check if the selector shape indicates support for DistinctTerms
   */
  private supportsDistinctTerms(selectorShape: any): boolean {
    if (selectorShape.type === 'operation') {
      return selectorShape.operation?.type === TypesComunica.DISTINCT_TERMS;
    }
    if (selectorShape.type === 'disjunction') {
      return selectorShape.children.some((child: any) => this.supportsDistinctTerms(child));
    }
    return false;
  }

  /**
   * Extract a pattern from the operation, handling GRAPH wrappers
   */
  private extractPattern(operation: Algebra.Operation): {
    pattern: Algebra.Pattern;
    graphTerm?: RDF.Term;
  } | undefined {
    // Direct pattern
    if (isKnownOperation(operation, Algebra.Types.PATTERN)) {
      return { pattern: operation };
    }

    // Pattern wrapped in GRAPH
    if (isKnownOperation(operation, Algebra.Types.GRAPH) &&
        isKnownOperation(operation.input, Algebra.Types.PATTERN)) {
      return {
        pattern: operation.input,
        graphTerm: operation.name,
      };
    }

    return undefined;
  }

  /**
   * Map projected variables to quad term positions
   */
  private mapVariablesToTerms(
    variables: RDF.Variable[],
    pattern: Algebra.Pattern,
  ): Record<string, 'subject' | 'predicate' | 'object' | 'graph'> | undefined {
    const termsMapping: Record<string, 'subject' | 'predicate' | 'object' | 'graph'> = {};
    const termPositions: { term: RDF.Term; position: 'subject' | 'predicate' | 'object' | 'graph' }[] = [
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
