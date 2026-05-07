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

  /**
   * Runs the function factory action and produces the corresponding function implementation.
   * @param action The function factory action to run.
   * @return A promise resolving to a term function output when term expressions are required,
   *         or a general function output otherwise.
   */
  public abstract override run<T extends IActionFunctionFactory>(action: T):
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput>;
}

/**
 * Represents a SPARQL expression function implementation.
 */
export interface IExpressionFunction {
  /**
   * Applies the function in the given evaluation context.
   * @param evalContext The expression evaluation context providing arguments and bindings.
   * @return A promise resolving to the resulting term expression.
   */
  apply: (evalContext: IEvalContext) => Promise<TermExpression>;
  /**
   * The arity of the function will be checked when parsing and preparing a function.
   * This allows us to check if the query is correct even before we process any bindings.
   */
  checkArity: (args: Expression[]) => boolean;
}

/**
 * Represents a term-level SPARQL function that supports direct evaluation on term expressions.
 */
export interface ITermFunction extends IExpressionFunction {
  /**
   * Flag indicating that this function supports direct term expression evaluation.
   */
  supportsTermExpressions: true;
  /**
   * Applies the function directly on an array of term expressions.
   * @param args The term expression arguments to evaluate.
   * @param exprEval The internal evaluator used during evaluation.
   * @return The resulting term expression.
   */
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

/**
 * Represents the output of a function factory actor, combining actor output with an expression function.
 */
export interface IActorFunctionFactoryOutput extends IActorOutput, IExpressionFunction {}

/**
 * Represents the output of a function factory actor that produces term-level functions.
 */
export interface IActorFunctionFactoryOutputTerm extends IActorOutput, ITermFunction {}

/**
 * Constructor arguments for {@link ActorFunctionFactory}.
 * @template TS The type of the test side data.
 */
export type IActorFunctionFactoryArgs<TS = undefined> = IActorArgs<
IActionFunctionFactory,
IActorTest,
IActorFunctionFactoryOutput,
TS
>;

/**
 * Unsafe mediator type for function factory that does not distinguish between term and non-term outputs.
 */
export type MediatorFunctionFactoryUnsafe = Mediate<IActionFunctionFactory, IActorFunctionFactoryOutput>;

/**
 * Mediator for function factory actors providing type-safe overloaded mediation.
 *
 * Returns {@link IActorFunctionFactoryOutputTerm} when `requireTermExpression` is `true`,
 * and {@link IActorFunctionFactoryOutput} otherwise.
 */
export abstract class MediatorFunctionFactory extends Mediator<
Actor<IActionFunctionFactory, IActorTest, IActorFunctionFactoryOutput>,
IActionFunctionFactory,
IActorTest,
IActorFunctionFactoryOutput
> {
  public abstract override mediate: <T extends IActionFunctionFactory>(action: T) =>
  Promise<T extends { requireTermExpression: true } ? IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput>;
}
