import { Bus } from '@comunica/core';
import { ActorFunctionFactoryGreaterThan } from '../lib/ActorFunctionFactoryGreaterThan';

describe('ActorFunctionFactoryGreaterThan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryGreaterThan instance', () => {
    let actor: ActorFunctionFactoryGreaterThan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryGreaterThan({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
