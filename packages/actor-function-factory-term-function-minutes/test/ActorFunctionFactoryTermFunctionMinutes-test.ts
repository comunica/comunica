import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMinutes } from '../lib/ActorFunctionFactoryTermFunctionMinutes';

describe('ActorFunctionFactoryTermFunctionMinutes', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMinutes instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMinutes;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMinutes({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
