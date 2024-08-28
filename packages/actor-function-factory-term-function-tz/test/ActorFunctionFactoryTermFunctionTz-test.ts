import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTz } from '../lib/ActorFunctionFactoryTermFunctionTz';

describe('ActorFunctionFactoryTermFunctionTz', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTz instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTz;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTz({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
