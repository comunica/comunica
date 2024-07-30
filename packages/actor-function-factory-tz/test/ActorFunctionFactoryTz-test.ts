import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTz } from '../lib/ActorFunctionFactoryTz';

describe('ActorFunctionFactoryTz', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTz instance', () => {
    let actor: ActorFunctionFactoryTz;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTz({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
