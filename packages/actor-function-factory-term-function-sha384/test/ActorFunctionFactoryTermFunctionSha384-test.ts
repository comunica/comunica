import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSha384 } from '../lib/ActorFunctionFactoryTermFunctionSha384';

describe('ActorFunctionFactoryTermFunctionSha384', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSha384 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSha384;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSha384({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
