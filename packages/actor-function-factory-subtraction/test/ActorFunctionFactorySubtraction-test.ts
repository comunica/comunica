import { Bus } from '@comunica/core';
import { ActorFunctionFactorySubtraction } from '../lib/ActorFunctionFactorySubtraction';

describe('ActorFunctionFactorySubtraction', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactorySubtraction instance', () => {
    let actor: ActorFunctionFactorySubtraction;

    beforeEach(() => {
      actor = new ActorFunctionFactorySubtraction({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
