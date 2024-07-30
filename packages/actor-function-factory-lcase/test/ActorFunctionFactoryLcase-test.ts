import { Bus } from '@comunica/core';
import { ActorFunctionFactoryLcase } from '../lib/ActorFunctionFactoryLcase';

describe('ActorFunctionFactoryLcase', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryLcase instance', () => {
    let actor: ActorFunctionFactoryLcase;

    beforeEach(() => {
      actor = new ActorFunctionFactoryLcase({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
