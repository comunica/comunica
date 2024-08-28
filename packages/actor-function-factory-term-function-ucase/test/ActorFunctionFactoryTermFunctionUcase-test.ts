import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUcase } from '../lib/ActorFunctionFactoryTermFunctionUcase';

describe('ActorFunctionFactoryTermFunctionUcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUcase instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUcase({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
