import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionNow } from '../lib/ActorFunctionFactoryTermFunctionNow';

describe('ActorFunctionFactoryTermFunctionNow', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionNow instance', () => {
    let actor: ActorFunctionFactoryTermFunctionNow;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionNow({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
