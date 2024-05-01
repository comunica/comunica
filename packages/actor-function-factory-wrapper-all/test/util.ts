import type { MediatorFunctionFactory } from '@comunica/bus-function-factory';
import { Bus } from '@comunica/core';
import type { TestTableConfig } from '@comunica/expression-evaluator/test/util/utils';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEFactory } from '@comunica/jest';
import { ActorFunctionFactoryWrapperAll } from '../lib';

export function createFuncActor() {
  const bus: any = new Bus({ name: 'bus' });
  const actor = new ActorFunctionFactoryWrapperAll({ name: 'actor', bus });
  return { actor, bus };
}

export function createFuncMediator(): MediatorFunctionFactory {
  return <MediatorFunctionFactory> {
    async mediate(action) {
      return createFuncActor().actor.run(action);
    },
  };
}

export function runFuncTestTable(arg: TestTableConfig): void {
  return runTestTable({
    exprEvalFactory: getMockEEFactory({
      mediatorFunctionFactory: createFuncMediator(),
    }),
    ...arg,
  });
}
