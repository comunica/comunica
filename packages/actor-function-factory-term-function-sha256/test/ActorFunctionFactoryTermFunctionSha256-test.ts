import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha256 } from '../lib/ActorFunctionFactoryTermFunctionSha256';

describe('ActorFunctionFactoryTermFunctionSha256', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha256 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha256;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha256({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
