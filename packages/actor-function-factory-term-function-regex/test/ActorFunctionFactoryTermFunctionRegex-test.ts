import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionRegex } from '../lib/ActorFunctionFactoryTermFunctionRegex';

describe('ActorFunctionFactoryTermFunctionRegex', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionRegex instance', () => {
    let actor: ActorFunctionFactoryTermFunctionRegex;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionRegex({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
