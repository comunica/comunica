import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionUuid } from '../lib/ActorFunctionFactoryTermFunctionUuid';

describe('ActorFunctionFactoryTermFunctionUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionUuid instance', () => {
    let actor: ActorFunctionFactoryTermFunctionUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionUuid({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
