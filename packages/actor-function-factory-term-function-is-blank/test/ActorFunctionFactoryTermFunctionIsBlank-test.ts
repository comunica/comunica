import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsBlank } from '../lib/ActorFunctionFactoryTermFunctionIsBlank';

describe('ActorFunctionFactoryTermFunctionIsBlank', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsBlank instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsBlank;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsBlank({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
