import type { IActorFunctionFactoryArgs, MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { Bus } from '@comunica/core';
import type { TestTableConfig } from '@comunica/expression-evaluator/test/util/utils';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEFactory } from '@comunica/jest';
import type { ActorFunctionFactory, IActionFunctionFactory } from '../lib';

interface RunFuncTestTableArgs extends IActorFunctionFactoryArgs {
  mediatorFunctionFactory: MediatorFunctionFactory;
}

export interface FuncTestTableConfig<E> extends TestTableConfig {
  registeredActors?: ((arg: RunFuncTestTableArgs & E) => ActorFunctionFactory)[];
  additionalArgs?: E;
}

export function createFuncMediator<E extends object>(
  registeredActors: ((arg: RunFuncTestTableArgs & E) => ActorFunctionFactory)[],
  additionalArgs: E,
): MediatorFunctionFactory {
  const mediatorFunctionFactory = <MediatorFunctionFactory> {
    async mediate(action: IActionFunctionFactory) {
      let availableActor;
      let index = 0;
      while (!availableActor && index < registeredActors.length) {
        try {
          const actor = registeredActors[index]({
            mediatorFunctionFactory,
            bus: new Bus({ name: 'test' }),
            name: 'test',
            ...additionalArgs,
          });
          await actor.test(action);
          availableActor = actor;
        } catch {
          // Do nothing
        }
        index++;
      }
      if (availableActor) {
        return availableActor.run(action);
      }
      throw new Error(`No registered actors on the function bus answered the mediator for:
${action.functionName}`);
    },
  };
  return mediatorFunctionFactory;
}

export function runFuncTestTable<E extends object>(arg: FuncTestTableConfig<E>): void {
  if (arg.registeredActors) {
    return runTestTable({
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory: createFuncMediator(arg.registeredActors, <E> arg.additionalArgs ?? {}),
      }),
      ...arg,
    });
  }
  return runTestTable(arg);
}
