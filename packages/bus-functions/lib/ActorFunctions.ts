import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor, Mediator } from '@comunica/core';
import type { IEvalContext, IInternalEvaluator } from '@comunica/expression-evaluator';
import type * as E from '@comunica/expression-evaluator/lib/expressions';
import type { Algebra as Alg } from 'sparqlalgebrajs';

/**
 * A comunica actor for functions events.
 *
 * Actor types:
 * * Input:  IActionFunctions:      TODO: fill in.
 * * Test:   <none>
 * * Output: IActorFunctionsOutput: TODO: fill in.
 *
 * @see IActionFunctions
 * @see IActorFunctionsOutput
 */
export abstract class ActorFunctions extends
  Actor<IActionFunctions, IActorTest, IActorFunctionsOutput> {
  /**
  * @param args - @defaultNested {<default_bus> a <cc:components/Bus.jsonld#Bus>} bus
  */
  public constructor(args: IActorFunctionsArgs) {
    super(args);
  }

  public abstract run<T extends IActionFunctions>(action: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput>;
}

export interface IExpressionFunction {
  apply: (evalContext: IEvalContext) => Promise<E.TermExpression>;
  /**
   * Makes you able to error in the termTransformer.
   */
  checkArity: (args: E.Expression[]) => boolean;
}

export interface ITermFunction extends IExpressionFunction {
  supportsTermExpressions: true;
  applyOnTerms: (args: E.TermExpression[], exprEval: IInternalEvaluator) => E.TermExpression;
}
export interface IActionFunctions extends IAction {
  functionName: string;
  arguments?: Alg.Expression[];
  requireTermExpression?: boolean;
}

export interface IActorFunctionsOutput extends IActorOutput, IExpressionFunction {}

export interface IActorFunctionsOutputTerm extends IActorOutput, ITermFunction {}

export type IActorFunctionsArgs = IActorArgs<
IActionFunctions, IActorTest, IActorFunctionsOutput>;

export type MediatorFunctionsUnsafe = Mediate<IActionFunctions, IActorFunctionsOutput>;

export abstract class MediatorFunctions extends Mediator<
Actor<IActionFunctions, IActorTest, IActorFunctionsOutput>,
IActionFunctions, IActorTest, IActorFunctionsOutput> {
  public abstract mediate: <T extends IActionFunctions>(action: T) =>
  Promise<T extends { requireTermExpression: true } ? IActorFunctionsOutputTerm : IActorFunctionsOutput>;
}
