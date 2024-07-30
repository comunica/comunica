import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTimezone } from '../lib/ActorFunctionFactoryTimezone';

describe('ActorFunctionFactoryTimezone', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTimezone instance', () => {
    let actor: ActorFunctionFactoryTimezone;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTimezone({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
