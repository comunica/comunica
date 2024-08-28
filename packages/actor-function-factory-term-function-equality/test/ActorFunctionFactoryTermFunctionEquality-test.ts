import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionEquality } from '../lib/ActorFunctionFactoryTermFunctionEquality';

describe('ActorFunctionFactoryTermFunctionEquality', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionEquality instance', () => {
    let actor: ActorFunctionFactoryTermFunctionEquality;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionEquality({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
