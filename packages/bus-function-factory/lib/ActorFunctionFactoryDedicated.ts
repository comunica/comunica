import type { IActorTest, TestResult } from '@comunica/core';
import { failTest, passTestVoid } from '@comunica/core';
import type { IActionFunctionFactory, IActorFunctionFactoryArgs } from './ActorFunctionFactory';
import { ActorFunctionFactory } from './ActorFunctionFactory';

type StringArray = [ string, ...string[]];

/**
 * A base implementation for function factory actors for a dedicated operator.
 */
export abstract class ActorFunctionFactoryDedicated extends ActorFunctionFactory {
  public readonly functionNames: StringArray;
  public readonly termFunction: boolean;

  protected constructor(args: IActorFunctionFactoryDedicatedArgs) {
    super(args);
  }

  public async test(action: IActionFunctionFactory): Promise<TestResult<IActorTest>> {
    // Name must match, if this is a term function, all is fine, if not, look whether term-function is not requested.
    if (this.functionNames.includes(action.functionName) && (this.termFunction || !action.requireTermExpression)) {
      return passTestVoid();
    }
    return failTest(`Actor ${this.name} can not provide implementation for "${action.functionName}", only for ${this.termFunction ? '' : 'non-termExpression '}${this.functionNames.join(' and ')}.`);
  }
}

export interface IActorFunctionFactoryDedicatedArgs extends IActorFunctionFactoryArgs {
  functionNames: StringArray;
  termFunction: boolean;
}
