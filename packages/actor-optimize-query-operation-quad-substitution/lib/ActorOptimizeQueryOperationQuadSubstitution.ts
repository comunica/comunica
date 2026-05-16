import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
  IActorOptimizeQueryOperationArgs,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { ComunicaDataFactory } from '@comunica/types';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';

/**
 * A comunica Quad Substitution Optimize Query Operation Actor.
 *
 * This actor optimizes GRAPH operations by pushing the graph term
 * into contained triple patterns, converting them to quad patterns.
 * This substitution is only performed when it is semantically safe.
 *
 * Unsafe cases (where the GRAPH operator is kept):
 * - The GRAPH has a variable name AND contains MINUS operations
 * - The GRAPH has a variable name AND contains GROUP operations
 * - The GRAPH contains no pattern-like operations to substitute into
 */
export class ActorOptimizeQueryOperationQuadSubstitution extends ActorOptimizeQueryOperation {
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }

  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory: ComunicaDataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    return {
      operation: ActorOptimizeQueryOperationQuadSubstitution.substituteQuads(algebraFactory, action.operation),
      context: action.context,
    };
  }

  /**
   * Recursively walk the algebra tree and substitute safe GRAPH operations with quad patterns.
   */
  public static substituteQuads(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.GRAPH]: {
        preVisitor: () => ({ continue: false }),
        transform: (graphOp: Algebra.Graph) => {
          if (ActorOptimizeQueryOperationQuadSubstitution.isSafeToSubstitute(graphOp)) {
            // Substitute graph term into all patterns and recurse on the result
            const substituted = ActorOptimizeQueryOperationQuadSubstitution
              .substituteGraphInOperation(algebraFactory, graphOp.input, graphOp.name);
            return ActorOptimizeQueryOperationQuadSubstitution.substituteQuads(algebraFactory, substituted);
          }
          // Unsafe: keep the GRAPH operator, but still recurse into inner operations
          // to handle any nested GRAPH operations
          return algebraFactory.createGraph(
            ActorOptimizeQueryOperationQuadSubstitution.substituteQuads(algebraFactory, graphOp.input),
            graphOp.name,
          );
        },
      },
    });
  }

  /**
   * Check whether it is safe to substitute a GRAPH operation with quad patterns.
   *
   * Substitution is safe when:
   * 1. The inner tree has at least one pattern-like operation (PATTERN, PATH, LINK, NPS)
   * 2. If the graph name is a variable, the inner tree does NOT contain MINUS or GROUP
   *
   * For variable graphs, we do NOT recurse into PROJECT (subquery) nodes because:
   * - Subqueries create a variable scope boundary
   * - The graph variable might collide with a same-named variable inside the subquery
   * - Patterns inside subqueries should not be counted as substitutable
   */
  public static isSafeToSubstitute(graphOp: Algebra.Graph): boolean {
    let hasPatterns = false;
    let hasMinus = false;
    let hasGroup = false;
    const isVariable = graphOp.name.termType === 'Variable';

    const scopeBoundary = {
      preVisitor: () => ({ continue: false }),
      visitor: () => { /* Noop */ },
    };

    algebraUtils.visitOperation(graphOp.input, {
      // Do not recurse into nested GRAPH operations:
      // their inner patterns belong to a different graph scope
      [Algebra.Types.GRAPH]: scopeBoundary,
      // For variable graphs, do not recurse into subqueries (PROJECT):
      // the subquery creates a scope boundary for variable bindings
      ...(isVariable ? { [Algebra.Types.PROJECT]: scopeBoundary } : {}),
      [Algebra.Types.PATTERN]: { visitor: () => {
        hasPatterns = true;
      } },
      [Algebra.Types.PATH]: { visitor: () => {
        hasPatterns = true;
      } },
      [Algebra.Types.LINK]: { visitor: () => {
        hasPatterns = true;
      } },
      [Algebra.Types.NPS]: { visitor: () => {
        hasPatterns = true;
      } },
      [Algebra.Types.MINUS]: { visitor: () => {
        hasMinus = true;
      } },
      [Algebra.Types.GROUP]: { visitor: () => {
        hasGroup = true;
      } },
    });

    if (!hasPatterns) {
      return false;
    }

    if (graphOp.name.termType === 'Variable' && (hasMinus || hasGroup)) {
      return false;
    }

    return true;
  }

  /**
   * Substitute the graph term into all pattern-like operations in the given operation tree.
   * Only DefaultGraph references in patterns are replaced.
   * For variable graphs, does not recurse into subqueries (PROJECT) to respect scope boundaries.
   */
  public static substituteGraphInOperation(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    graphTerm: Algebra.Graph['name'],
  ): Algebra.Operation {
    const noRecurse = {
      preVisitor: () => ({ continue: false }),
      transform: (op: Algebra.Operation) => op,
    };

    return algebraUtils.mapOperation(operation, {
      // Do not recurse into nested GRAPH operations:
      // their patterns belong to a different graph scope
      [Algebra.Types.GRAPH]: noRecurse,
      // For variable graphs, do not recurse into subqueries (PROJECT):
      // the subquery creates a scope boundary for variable bindings
      ...(graphTerm.termType === 'Variable' ? { [Algebra.Types.PROJECT]: noRecurse } : {}),
      [Algebra.Types.PATTERN]: {
        preVisitor: () => ({ continue: false }),
        transform: (pattern: Algebra.Pattern) => {
          if (pattern.graph.termType === 'DefaultGraph') {
            return Object.assign(
              algebraFactory.createPattern(pattern.subject, pattern.predicate, pattern.object, graphTerm),
              { metadata: pattern.metadata },
            );
          }
          return pattern;
        },
      },
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false }),
        transform: (path: Algebra.Path) => {
          if (path.graph.termType === 'DefaultGraph') {
            return algebraFactory.createPath(path.subject, path.predicate, path.object, graphTerm);
          }
          return path;
        },
      },
    });
  }
}
