import { Bus } from '@comunica/core';
import { ActorFunctionFactoryMinutes } from '../lib/ActorFunctionFactoryMinutes';

describe('ActorFunctionFactoryMinutes', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryMinutes instance', () => {
    let actor: ActorFunctionFactoryMinutes;

    beforeEach(() => {
      actor = new ActorFunctionFactoryMinutes({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
