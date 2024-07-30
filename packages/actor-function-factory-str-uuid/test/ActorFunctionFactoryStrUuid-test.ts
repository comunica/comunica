import { Bus } from '@comunica/core';
import { ActorFunctionFactoryStrUuid } from '../lib/ActorFunctionFactoryStrUuid';

describe('ActorFunctionFactoryStrUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryStrUuid instance', () => {
    let actor: ActorFunctionFactoryStrUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryStrUuid({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
