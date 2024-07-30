import { Bus } from '@comunica/core';
import { ActorFunctionFactoryContains } from '../lib/ActorFunctionFactoryContains';

describe('ActorFunctionFactoryContains', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryContains instance', () => {
    let actor: ActorFunctionFactoryContains;

    beforeEach(() => {
      actor = new ActorFunctionFactoryContains({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
