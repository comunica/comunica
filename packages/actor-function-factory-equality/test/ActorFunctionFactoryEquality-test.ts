import { Bus } from '@comunica/core';
import { ActorFunctionFactoryEquality } from '../lib/ActorFunctionFactoryEquality';

describe('ActorFunctionFactoryEquality', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryEquality instance', () => {
    let actor: ActorFunctionFactoryEquality;

    beforeEach(() => {
      actor = new ActorFunctionFactoryEquality({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
