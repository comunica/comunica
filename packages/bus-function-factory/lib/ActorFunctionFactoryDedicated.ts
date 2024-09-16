import type { IActorTest } from '@comunica/core';
import type { IActionFunctionFactory, IActorFunctionFactoryArgs } from './ActorFunctionFactory';
import { ActorFunctionFactory } from './ActorFunctionFactory';

type StringArray = [ string, ...string[]];

/**
 * A base implementation for function factory actors for a dedicated operator.
 */
export abstract class ActorFunctionFactoryDedicated extends ActorFunctionFactory {
  public readonly functionNames: StringArray;
  public readonly termFunction: boolean;

  protected constructor(args: IActorFunctionFactoryArgs, functionNames: StringArray, termFunction: boolean) {
    super(args);
    this.functionNames = functionNames;
    this.termFunction = termFunction;
  }

  public async test(action: IActionFunctionFactory): Promise<IActorTest> {
    // Name must match, if this is a term function, all is fine, if not, look whether term-function is not requested.
    if (this.functionNames.includes(action.functionName) && (this.termFunction || !action.requireTermExpression)) {
      return true;
    }
    throw new Error(`Actor ${this.name} can not provide implementation for ${action.functionName}, only for ${this.termFunction ? '' : 'non-termExpression '}${this.functionNames.join(' and ')}.}`);
  }
}
