import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionStrLan } from '../lib/ActorFunctionFactoryTermFunctionStrLan';

describe('ActorFunctionFactoryTermFunctionStrLan', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionStrLan instance', () => {
    let actor: ActorFunctionFactoryTermFunctionStrLan;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionStrLan({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
