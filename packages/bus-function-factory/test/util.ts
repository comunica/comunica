import type {
  IActorFunctionFactoryArgs,
  MediatorFunctionFactory,
} from '@comunica/bus-function-factory';
import { BusFunctionFactory } from '@comunica/bus-function-factory';
import type { TestTableConfig } from '@comunica/expression-evaluator/test/util/utils';
import { runTestTable } from '@comunica/expression-evaluator/test/util/utils';
import { MediatorRace } from '@comunica/mediator-race';
import { getMockEEFactory } from '@comunica/utils-jest';
import type { ActorFunctionFactory } from '../lib';

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
  const bus = new BusFunctionFactory({ name: 'test-bus-function-factory' });
  const mediatorFunctionFactory = <MediatorFunctionFactory> new MediatorRace({
    name: 'test-mediator-function-factory',
    bus,
  });
  for (const constructor of registeredActors) {
    constructor({
      mediatorFunctionFactory,
      bus,
      name: 'test',
      ...additionalArgs,
    });
  }
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
