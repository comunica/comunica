import type {
  IActionOptimizeQueryOperation,
  IActorOptimizeQueryOperationOutput,
} from '@comunica/bus-optimize-query-operation';
import { ActorOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import { Algebra, AlgebraFactory, algebraUtils } from '@comunica/utils-algebra';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Quad Substitution Optimize Query Operation Actor.
 *
 * Pushes GRAPH operations into quad patterns when it is safe to do so.
 * GRAPH with a named node is always safe to push down.
 * GRAPH with a variable is only safe when the subtree does not contain:
 * - MINUS (variable disjointness would change)
 * - PROJECT (subquery scope boundary)
 * - VALUES that bind the graph variable
 * - EXTEND that binds the graph variable
 */
export class ActorOptimizeQueryOperationQuadSubstitution extends ActorOptimizeQueryOperation {
  public async test(_action: IActionOptimizeQueryOperation): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async run(action: IActionOptimizeQueryOperation): Promise<IActorOptimizeQueryOperationOutput> {
    const dataFactory = action.context.getSafe(KeysInitQuery.dataFactory);
    const algebraFactory = new AlgebraFactory(dataFactory);

    const operation = algebraUtils.mapOperation(action.operation, {
      [Algebra.Types.GRAPH]: {
        transform: (graphOp: Algebra.Graph) => {
          // Only substitute if there are default-graph patterns to push the graph into.
          // Without such patterns (e.g., empty BGP), the GRAPH wrapper provides graph
          // existence/enumeration semantics that would be lost by substitution.
          if (!ActorOptimizeQueryOperationQuadSubstitution.hasDefaultGraphPatterns(graphOp.input)) {
            return graphOp;
          }
          if (graphOp.name.termType === 'NamedNode' ||
            ActorOptimizeQueryOperationQuadSubstitution
              .isSafeForQuadSubstitution(graphOp.input, graphOp.name)) {
            return ActorOptimizeQueryOperationQuadSubstitution
              .pushDownGraph(algebraFactory, graphOp.input, graphOp.name);
          }
          return graphOp;
        },
      },
    });
    return { operation, context: action.context };
  }

  /**
   * Check if it is safe to substitute a graph variable into quad patterns.
   * It is unsafe if the subtree contains MINUS, PROJECT (subquery), VALUES that bind the graph variable,
   * or EXTEND that binds the graph variable.
   * Inner GRAPH and SERVICE operations create their own scope and are not checked.
   */
  public static isSafeForQuadSubstitution(operation: Algebra.Operation, graphVariable: RDF.Variable): boolean {
    let safe = true;
    algebraUtils.visitOperation(operation, {
      // The inner graph would cause rescoping, so no new info for us here.
      [Algebra.Types.GRAPH]: { preVisitor: () => ({ continue: false }) },
      // The remote service executes the data against it's own dataset
      [Algebra.Types.SERVICE]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.MINUS]: {
        preVisitor: () => {
          safe = false;
          return { shortcut: true };
        },
      },
      [Algebra.Types.PROJECT]: {
        preVisitor: () => {
          safe = false;
          return { shortcut: true };
        },
      },
      [Algebra.Types.VALUES]: {
        preVisitor: (op: Algebra.Values) => {
          if (op.variables.some((v: RDF.Variable) => v.equals(graphVariable))) {
            safe = false;
            return { shortcut: true };
          }
          return {};
        },
      },
      [Algebra.Types.EXTEND]: {
        preVisitor: (op: Algebra.Extend) => {
          if (op.variable.equals(graphVariable)) {
            safe = false;
            return { shortcut: true };
          }
          return {};
        },
      },
    });
    return safe;
  }

  /**
   * Check if an operation tree contains any patterns or paths using the default graph.
   * These are the targets for pushDownGraph — if none exist, graph substitution is a no-op
   * and the GRAPH wrapper must be preserved for existence/enumeration semantics.
   */
  public static hasDefaultGraphPatterns(operation: Algebra.Operation): boolean {
    let found = false;
    algebraUtils.visitOperation(operation, {
      [Algebra.Types.PATTERN]: {
        preVisitor: (pattern: Algebra.Pattern) => {
          if (pattern.graph.termType === 'DefaultGraph') {
            found = true;
            return { shortcut: true };
          }
          return { continue: false };
        },
      },
      [Algebra.Types.PATH]: {
        preVisitor: (path: Algebra.Path) => {
          if (path.graph.termType === 'DefaultGraph') {
            found = true;
            return { shortcut: true };
          }
          return { continue: false };
        },
      },
      [Algebra.Types.GRAPH]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.SERVICE]: { preVisitor: () => ({ continue: false }) },
    });
    return found;
  }

  /**
   * Push a graph term into all patterns and paths that use the default graph.
   * Does not recurse into nested GRAPH or SERVICE operations.
   */
  public static pushDownGraph(
    algebraFactory: AlgebraFactory,
    operation: Algebra.Operation,
    graph: RDF.NamedNode | RDF.Variable,
  ): Algebra.Operation {
    return algebraUtils.mapOperation(operation, {
      [Algebra.Types.PATTERN]: { transform: (pattern: Algebra.Pattern) => {
        if (pattern.graph.termType === 'DefaultGraph') {
          return Object.assign(
            algebraFactory.createPattern(pattern.subject, pattern.predicate, pattern.object, graph),
            { metadata: pattern.metadata },
          );
        }
        return pattern;
      } },
      [Algebra.Types.PATH]: {
        preVisitor: () => ({ continue: false }),
        transform: (path: Algebra.Path) => {
          if (path.graph.termType === 'DefaultGraph') {
            return Object.assign(
              algebraFactory.createPath(path.subject, path.predicate, path.object, graph),
              { metadata: path.metadata },
            );
          }
          return path;
        },
      },
      [Algebra.Types.GRAPH]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.SERVICE]: { preVisitor: () => ({ continue: false }) },
    });
  }
}
