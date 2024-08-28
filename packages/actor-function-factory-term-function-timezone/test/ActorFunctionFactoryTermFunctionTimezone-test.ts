import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTimezone } from '../lib/ActorFunctionFactoryTermFunctionTimezone';

describe('ActorFunctionFactoryTermFunctionTimezone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTimezone instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTimezone;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTimezone({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
