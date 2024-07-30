import { Bus } from '@comunica/core';
import { ActorFunctionFactorySeconds } from '../lib/ActorFunctionFactorySeconds';

describe('ActorFunctionFactorySeconds', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySeconds instance', () => {
    let actor: ActorFunctionFactorySeconds;

    beforeEach(() => {
      actor = new ActorFunctionFactorySeconds({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
