import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSeconds } from '../lib/ActorFunctionFactoryTermFunctionSeconds';

describe('ActorFunctionFactoryTermFunctionSeconds', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSeconds instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSeconds;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSeconds({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
