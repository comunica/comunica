import type { MediatorFunctions } from '@comunica/bus-functions';
import { Bus } from '@comunica/core';
import type { TestTableConfig } from '@comunica/expression-evaluator/test/util/utils';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { getMockEEFactory } from '@comunica/jest';
import { ActorFunctionsWrapperAll } from '../lib';

export function createFuncActor() {
  const bus: any = new Bus({ name: 'bus' });
  const actor = new ActorFunctionsWrapperAll({ name: 'actor', bus });
  return { actor, bus };
}

export function createFuncMediator(): MediatorFunctions {
  return <MediatorFunctions> {
    async mediate(action) {
      return createFuncActor().actor.run(action);
    },
  };
}

export function runFuncTestTable(arg: TestTableConfig): void {
  return runTestTable({
    exprEvalFactory: getMockEEFactory({
      mediatorFunctions: createFuncMediator(),
    }),
    ...arg,
  });
}
