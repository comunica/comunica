import { Bus } from '@comunica/core';
import { ActorFunctionFactoryNow } from '../lib/ActorFunctionFactoryNow';

describe('ActorFunctionFactoryNow', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryNow instance', () => {
    let actor: ActorFunctionFactoryNow;

    beforeEach(() => {
      actor = new ActorFunctionFactoryNow({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
