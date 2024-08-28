import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha512 } from '../lib/ActorFunctionFactoryTermFunctionSha512';

describe('ActorFunctionFactoryTermFunctionSha512', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha512 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha512;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha512({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
