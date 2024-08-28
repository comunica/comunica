import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionDatatype } from '../lib/ActorFunctionFactoryTermFunctionDatatype';

describe('ActorFunctionFactoryTermFunctionDatatype', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionDatatype instance', () => {
    let actor: ActorFunctionFactoryTermFunctionDatatype;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionDatatype({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
