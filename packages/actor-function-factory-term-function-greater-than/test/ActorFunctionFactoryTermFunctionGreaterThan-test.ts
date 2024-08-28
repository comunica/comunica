import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionGreaterThan } from '../lib/ActorFunctionFactoryTermFunctionGreaterThan';

describe('ActorFunctionFactoryTermFunctionGreaterThan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionGreaterThan instance', () => {
    let actor: ActorFunctionFactoryTermFunctionGreaterThan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionGreaterThan({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
