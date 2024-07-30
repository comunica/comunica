import { Bus } from '@comunica/core';
import { ActorFunctionFactoryUuid } from '../lib/ActorFunctionFactoryUuid';

describe('ActorFunctionFactoryUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryUuid instance', () => {
    let actor: ActorFunctionFactoryUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryUuid({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
