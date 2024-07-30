import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIsNumeric } from '../lib/ActorFunctionFactoryIsNumeric';

describe('ActorFunctionFactoryIsNumeric', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIsNumeric instance', () => {
    let actor: ActorFunctionFactoryIsNumeric;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIsNumeric({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
