import type { IAction, IActorArgs, IActorOutput, IActorTest, Mediate } from '@comunica/core';
import { Actor, Mediator } from '@comunica/core';
import type { Expression, IEvalContext, IInternalEvaluator, TermExpression } from '@comunica/types';
import type { Algebra as Alg } from '@comunica/utils-algebra';

/**
 * A comunica actor for function factory events.
 *
 * Actor types:
 * * Input:  IActionFunctions: A request to receive a function implementation for a given function name
 * and potentially the function arguments.
 * * Test:   <none>
 * * Output: IActorFunctionsOutput: A function implementation.
 *
 * @see IActionFunctionFactory
 * @see IActorFunctionFactoryOutput
 */
export abstract class ActorFunctionFactory<TS = undefined> extends
  Actor<IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput, TS> {
  /* eslint-disable max-len */
  /**
   * @param args -
   * \ @defaultNested {<default_bus> a <cbff:components/BusFunctionFactory.jsonld#BusFunctionFactory>} bus
   * \ @defaultNested {Creation of function evaluator failed: no configured actor was able to evaluate function ${action.functionName}} busFailMessage
   */
  /* eslint-enable max-len */
  public constructor(args: IActorFunctionFactoryArgs<TS>) {
    super(args);
  }

  public abstract override run<T extends IActionFunctionFactory>(action: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput>;
}

export interface IExpressionFunction {
  apply: (evalContext: IEvalContext) => Promise<TermExpression>;
  /**
   * The arity of the function will be checked when parsing and preparing a function.
   * This allows us to check if the query is correct even before we process any bindings.
   */
  checkArity: (args: Expression[]) => boolean;
}

export interface ITermFunction extends IExpressionFunction {
  supportsTermExpressions: true;
  applyOnTerms: (args: TermExpression[], exprEval: IInternalEvaluator) => TermExpression;
}
export interface IActionFunctionFactory extends IAction {
  /**
   * The name of the function to retrieve. Can be any string, a function name, or a URL.
   */
  functionName: string;
  /**
   * The arguments of the function, if they are known, and don't change.
   */
  arguments?: Alg.Expression[];
  /**
   * Whether the function should return a term expression.
   */
  requireTermExpression?: boolean;
}

export interface IActorFunctionFactoryOutput extends IActorOutput, IExpressionFunction {}

export interface IActorFunctionFactoryOutputTerm extends IActorOutput, ITermFunction {}

export type IActorFunctionFactoryArgs<TS = undefined> = IActorArgs<
IActionFunctionFactory,
IActorTest,
IActorFunctionFactoryOutput,
TS
>;

export type MediatorFunctionFactoryUnsafe = Mediate<IActionFunctionFactory, IActorFunctionFactoryOutput>;

export abstract class MediatorFunctionFactory extends Mediator<
Actor<IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput>,
IActionFunctionFactory,
IActorTest,
IActorFunctionFactoryOutput
> {
  public abstract override mediate: <T extends IActionFunctionFactory>(action: T) =>
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput>;
}
