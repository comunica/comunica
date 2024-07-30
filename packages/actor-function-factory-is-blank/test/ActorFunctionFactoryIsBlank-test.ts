import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIsBlank } from '../lib/ActorFunctionFactoryIsBlank';

describe('ActorFunctionFactoryIsBlank', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIsBlank instance', () => {
    let actor: ActorFunctionFactoryIsBlank;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIsBlank({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
