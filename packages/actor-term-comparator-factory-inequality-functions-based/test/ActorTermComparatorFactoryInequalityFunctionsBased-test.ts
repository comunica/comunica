import { createFuncMediator } from '@comunica/actor-functions-wrapper-all/test/util';
import { Bus } from '@comunica/core';
import { getMockEEFactory } from '@comunica/jest';
import {
  ActorTermComparatorFactoryInequalityFunctionsBased,
} from '../lib';

describe('ActorTermComparatorFactoryInequalityFunctionsBased', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorTermComparatorFactoryInequalityFunctionsBased instance', () => {
    let actor: ActorTermComparatorFactoryInequalityFunctionsBased;

    beforeEach(() => {
      actor = new ActorTermComparatorFactoryInequalityFunctionsBased({
        name: 'actor',
        bus,
        mediatorFunctions: createFuncMediator(),
        mediatorQueryOperation: getMockEEFactory().mediatorQueryOperation,
      });
    });

    it('should test', () => {
      // Return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      // Return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
