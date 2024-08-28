import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionInequality } from '../lib/ActorFunctionFactoryTermFunctionInequality';

describe('ActorFunctionFactoryTermFunctionInequality', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionInequality instance', () => {
    let actor: ActorFunctionFactoryTermFunctionInequality;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionInequality({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
