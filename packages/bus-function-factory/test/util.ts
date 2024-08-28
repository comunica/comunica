import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import type { TestTableConfig } from '@comunica/expression-evaluator/test/util/utils';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEFactory } from '@comunica/jest';
import type { ActorFunctionFactory, IActionFunctionFactory } from '../lib';

export function createFuncMediator(
  registeredActors: ((mediator: MediatorFunctionFactory) => ActorFunctionFactory)[],
): MediatorFunctionFactory {
  const mediatorFunctionFactory = <MediatorFunctionFactory> {
    async mediate(action: IActionFunctionFactory) {
      let availableActor;
      let index = 0;
      while (!availableActor && index < registeredActors.length) {
        try {
          const actor = registeredActors[index](mediatorFunctionFactory);
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
      throw new Error('No registered actors on the function bus answered the mediator');
    },
  };
  return mediatorFunctionFactory;
}

export function runFuncTestTable(
  arg: TestTableConfig & { registeredActors?: ((mediator: MediatorFunctionFactory) => ActorFunctionFactory)[] },
): void {
  if (arg.registeredActors) {
    return runTestTable({
      exprEvalFactory: getMockEEFactory({
        mediatorFunctionFactory: createFuncMediator(arg.registeredActors),
      }),
      ...arg,
    });
  }
  return runTestTable(arg);
}
