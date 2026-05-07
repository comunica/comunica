import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionFunctionFactory, IActorFunctionFactoryArgs } from './ActorFunctionFactory';
import { ActorFunctionFactory } from './ActorFunctionFactory';

type StringArray = [ string, ...string[]];

/**
 * A base implementation for function factory actors for a dedicated operator.
 */
export abstract class ActorFunctionFactoryDedicated extends ActorFunctionFactory {
  /**
   * The function names this actor is able to handle.
   */
  public readonly functionNames: StringArray;
  /**
   * Whether this actor produces term-level functions.
   */
  public readonly termFunction: boolean;

  protected constructor(args: IActorFunctionFactoryDedicatedArgs) {
    super(args);
    this.functionNames = args.functionNames;
    this.termFunction = args.termFunction;
  }

  /**
   * Tests whether this actor can handle the given function factory action.
   * @param action The function factory action to test.
   * @return A promise resolving to a passing test result if the function name matches
   *         and term expression requirements are satisfied, or a failing test result otherwise.
   */
  public async test(action: IActionFunctionFactory): Promise<TestResult<IActorTest>> {
    // Name must match, if this is a term function, all is fine, if not, look whether term-function is not requested.
    if (this.functionNames.includes(action.functionName) && (this.termFunction || !action.requireTermExpression)) {
      return passTestVoid();
    }
    return failTest(`Actor ${this.name} can not provide implementation for "${action.functionName}", only for ${this.termFunction ? '' : 'non-termExpression '}${this.functionNames.join(' and ')}.`);
  }
}

/**
 * Constructor arguments for {@link ActorFunctionFactoryDedicated}.
 */
export interface IActorFunctionFactoryDedicatedArgs extends IActorFunctionFactoryArgs {
  functionNames: StringArray;
  termFunction: boolean;
}
