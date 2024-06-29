import { Bus } from '@comunica/core';
import { ActorFunctionFactoryNot } from '../lib/ActorFunctionFactoryNot';

describe('ActorFunctionFactoryNot', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryNot instance', () => {
    let actor: ActorFunctionFactoryNot;

    beforeEach(() => {
      actor = new ActorFunctionFactoryNot({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
