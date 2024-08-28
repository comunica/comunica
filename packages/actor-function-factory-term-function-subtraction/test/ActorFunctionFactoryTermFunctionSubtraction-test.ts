import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionSubtraction } from '../lib/ActorFunctionFactoryTermFunctionSubtraction';

describe('ActorFunctionFactoryTermFunctionSubtraction', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionSubtraction instance', () => {
    let actor: ActorFunctionFactoryTermFunctionSubtraction;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionSubtraction({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
