import { Bus } from '@comunica/core';
import { ActorFunctionFactoryUcase } from '../lib/ActorFunctionFactoryUcase';

describe('ActorFunctionFactoryUcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryUcase instance', () => {
    let actor: ActorFunctionFactoryUcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryUcase({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
