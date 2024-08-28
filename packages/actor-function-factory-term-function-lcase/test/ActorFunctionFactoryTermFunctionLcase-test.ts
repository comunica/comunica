import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionLcase } from '../lib/ActorFunctionFactoryTermFunctionLcase';

describe('ActorFunctionFactoryTermFunctionLcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionLcase instance', () => {
    let actor: ActorFunctionFactoryTermFunctionLcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionLcase({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
