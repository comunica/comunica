import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionAbs } from '../lib/ActorFunctionFactoryTermFunctionAbs';

describe('ActorFunctionFactoryTermFunctionAbs', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionAbs instance', () => {
    let actor: ActorFunctionFactoryTermFunctionAbs;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionAbs({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
