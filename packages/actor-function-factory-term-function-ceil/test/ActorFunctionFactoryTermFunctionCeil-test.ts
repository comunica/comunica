import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionCeil } from '../lib/ActorFunctionFactoryTermFunctionCeil';

describe('ActorFunctionFactoryTermFunctionCeil', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionCeil instance', () => {
    let actor: ActorFunctionFactoryTermFunctionCeil;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionCeil({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
