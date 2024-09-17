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
export abstract class ActorOptimizeQueryOperation<TS = undefined>
  extends Actor<IActionOptimizeQueryOperation, IActorTest, IActorOptimizeQueryOperationOutput, TS> {
  /**
   * @param args -
   *   \ @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
   *   \ @defaultNested {Query optimization failed: none of the configured actors were able to optimize} busFailMessage
   */
  public constructor(args: IActorOptimizeQueryOperationArgs<TS>) {
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

export type IActorOptimizeQueryOperationArgs<TS = undefined> = IActorArgs<
IActionOptimizeQueryOperation,
IActorTest,
IActorOptimizeQueryOperationOutput,
TS
>;

export type MediatorOptimizeQueryOperation = Mediate<
IActionOptimizeQueryOperation,
IActorOptimizeQueryOperationOutput
>;
