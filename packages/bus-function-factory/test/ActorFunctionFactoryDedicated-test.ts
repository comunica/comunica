import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import {
  ActorFunctionFactoryDedicated,
} from '../lib';
import type {
  IActorFunctionFactoryDedicatedArgs,
  IActorFunctionFactoryOutput,
  IActorFunctionFactoryOutputTerm,
  IActionFunctionFactory,
} from '../lib';

describe('ActorFunctionFactoryDedicated', () => {
  class TestActorFunctionFactoryDedicated extends ActorFunctionFactoryDedicated {
    public constructor(args: IActorFunctionFactoryDedicatedArgs) {
      super(args);
    }

    public async run<T extends IActionFunctionFactory>(_: T): Promise<T extends { requireTermExpression: true } ?
      IActorFunctionFactoryOutputTerm : IActorFunctionFactoryOutput> {
      return <any> undefined;
    }
  }

  describe('has a test function for non-term-function', () => {
    let actor: TestActorFunctionFactoryDedicated;
    let context: IActionContext;
    beforeEach(() => {
      actor = new TestActorFunctionFactoryDedicated({
        bus: new Bus({ name: 'bus' }),
        name: 'actor',
        functionNames: [ 'apple' ],
        termFunction: false,
      });
      context = new ActionContext();
    });

    it('it throws on wrong functionName', async() => {
      await expect(actor.test({
        functionName: 'pear',
        context,
        requireTermExpression: false,
      })).rejects.toThrow('Actor actor can not provide implementation for "pear", only for non-termExpression apple.');
    });

    it('it throws on requireTermFunction on non-term-function', async() => {
      await expect(actor.test({
        functionName: 'apple',
        context,
        requireTermExpression: true,
      })).rejects.toThrow('Actor actor can not provide implementation for "apple", only for non-termExpression apple.');
    });

    it('passes if all match', async() => {
      await expect(actor.test({
        functionName: 'apple',
        context,
        requireTermExpression: false,
      })).resolves.toBeTruthy();
    });
  });

  describe('has a test function for term-function', () => {
    let actor: TestActorFunctionFactoryDedicated;
    let context: IActionContext;
    beforeEach(() => {
      actor = new TestActorFunctionFactoryDedicated({
        bus: new Bus({ name: 'bus' }),
        name: 'actor',
        functionNames: [ 'apple' ],
        termFunction: true,
      });
      context = new ActionContext();
    });

    it('it throws on wrong functionName', async() => {
      await expect(actor.test({
        functionName: 'pear',
        context,
        requireTermExpression: false,
      })).rejects.toThrow('Actor actor can not provide implementation for "pear", only for apple.');
    });

    it('passes on requireTermFunction', async() => {
      await expect(actor.test({
        functionName: 'apple',
        context,
        requireTermExpression: true,
      })).resolves.toBeTruthy();
    });

    it('passes on not requireTermFunction', async() => {
      await expect(actor.test({
        functionName: 'apple',
        context,
        requireTermExpression: false,
      })).resolves.toBeTruthy();
    });
  });
});
