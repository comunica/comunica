import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsNumeric } from '../lib/ActorFunctionFactoryTermFunctionIsNumeric';

describe('ActorFunctionFactoryTermFunctionIsNumeric', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsNumeric instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsNumeric;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsNumeric({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
