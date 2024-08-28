import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionMd5 } from '../lib/ActorFunctionFactoryTermFunctionMd5';

describe('ActorFunctionFactoryTermFunctionMd5', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionMd5 instance', () => {
    let actor: ActorFunctionFactoryTermFunctionMd5;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionMd5({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
