import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import type { Algebra } from 'sparqlalgebrajs';

/**
 * A comunica actor for optimize-query-operation events.
 *
 * Actor types:
 * * Input:  IActionOptimizeQueryOperation:      An incoming SPARQL operation.
 * * Test:   <none>
 * * Output: IActorOptimizeQueryOperationOutput: A (possibly optimized) outgoing SPARQL operation.
 *
 * @see IActionOptimizeQueryOperation
 * @see IActorOptimizeQueryOperationOutput
 */
export abstract class ActorOptimizeQueryOperation
  extends Actor<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput> {
  /**
   * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   */
  public constructor(args: IActorOptimizeQueryOperationArgs) {
    super(args);
  }
}

export interface IActionOptimizeQueryOperation extends IAction {
  operation: Algebra.Operation;
}

export interface IActorOptimizeQueryOperationOutput extends IActorOutput {
  operation: Algebra.Operation;
  context: IActionContext;
}

export type IActorOptimizeQueryOperationArgs = IActorArgs<
IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput>;

export type MediatorOptimizeQueryOperation = Mediate<
IActionOptimizeQueryOperation, IActorOptimizeQueryOperationOutput>;
