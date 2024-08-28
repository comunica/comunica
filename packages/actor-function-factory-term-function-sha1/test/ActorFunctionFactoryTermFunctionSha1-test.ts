import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha1 } from '../lib/ActorFunctionFactoryTermFunctionSha1';

describe('ActorFunctionFactoryTermFunctionSha1', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha1 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha1;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha1({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
