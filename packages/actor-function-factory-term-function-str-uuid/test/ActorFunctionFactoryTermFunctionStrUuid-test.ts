import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrUuid } from '../lib/ActorFunctionFactoryTermFunctionStrUuid';

describe('ActorFunctionFactoryTermFunctionStrUuid', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrUuid instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrUuid;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrUuid({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
