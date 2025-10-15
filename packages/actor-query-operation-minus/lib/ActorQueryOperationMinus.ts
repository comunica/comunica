import type { IActorQueryOperationTypedMediatedArgs } from '@comunica/bus-query-operation';
import {
  ActorQueryOperationTypedMediated,
} from '@comunica/bus-query-operation';
import type { MediatorRdfJoin } from '@comunica/bus-rdf-join';
import type { IActorTest, TestResult } from '@comunica/core';
import { passTestVoid } from '@comunica/core';
import type { IActionContext, IQueryOperationResult, IJoinEntry } from '@comunica/types';
import { Algebra, algebraUtils } from '@comunica/utils-algebra';
import { getSafeBindings } from '@comunica/utils-query-operation';
import type * as RDF from '@rdfjs/types';

/**
 * A comunica Minus Query Operation Actor.
 */
export class ActorQueryOperationMinus extends ActorQueryOperationTypedMediated<Algebra.Minus> {
  public readonly mediatorJoin: MediatorRdfJoin;

  public constructor(args: IActorQueryOperationMinusArgs) {
    super(args, Algebra.Types.MINUS);
  }

  public async testOperation(_operation: Algebra.Minus, _context: IActionContext): Promise<TestResult<IActorTest>> {
    return passTestVoid();
  }

  public async runOperation(
    operationOriginal: Algebra.Minus,
    context: IActionContext,
  ): Promise<IQueryOperationResult> {
    // Propagate information about GRAPH ?g existing outside the MINUS scope to the join actor.
    let graphVariableFromParentScope: RDF.Variable | undefined;
    // A pattern with a graph variable that is not contained within its own graph operation,
    // got its graph from a graph operation that is an ancestor of this minus.
    algebraUtils.visitOperation(operationOriginal.input, {
      [Algebra.Types.GRAPH]: { preVisitor: () => ({ continue: false }) },
      [Algebra.Types.PATTERN]: { preVisitor: (patternOp) => {
        if (patternOp.graph.termType === 'Variable') {
          graphVariableFromParentScope = patternOp.graph;
          return { shortcut: true };
        }
        return {};
      } },
    });

    const entries: IJoinEntry[] = (await Promise.all(operationOriginal.input
      .map(async subOperation => ({
        output: await this.mediatorQueryOperation.mediate({ operation: subOperation, context }),
        operation: subOperation,
      }))))
      .map(({ output, operation }) => ({
        output: getSafeBindings(output),
        operation,
      }));

    return this.mediatorJoin.mediate({ type: 'minus', entries, context, graphVariableFromParentScope });
  }
}

export interface IActorQueryOperationMinusArgs extends IActorQueryOperationTypedMediatedArgs {
  /**
   * A mediator for joining Bindings streams
   */
  mediatorJoin: MediatorRdfJoin;
}
