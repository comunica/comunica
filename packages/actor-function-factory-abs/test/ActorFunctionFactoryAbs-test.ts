import { Bus } from '@comunica/core';
import { ActorFunctionFactoryAbs } from '../lib/ActorFunctionFactoryAbs';

describe('ActorFunctionFactoryAbs', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryAbs instance', () => {
    let actor: ActorFunctionFactoryAbs;

    beforeEach(() => {
      actor = new ActorFunctionFactoryAbs({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
