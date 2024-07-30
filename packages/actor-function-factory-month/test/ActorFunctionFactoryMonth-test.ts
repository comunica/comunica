import { Bus } from '@comunica/core';
import { ActorFunctionFactoryMonth } from '../lib/ActorFunctionFactoryMonth';

describe('ActorFunctionFactoryMonth', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryMonth instance', () => {
    let actor: ActorFunctionFactoryMonth;

    beforeEach(() => {
      actor = new ActorFunctionFactoryMonth({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
