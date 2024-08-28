import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionTriple } from '../lib/ActorFunctionFactoryTermFunctionTriple';

describe('ActorFunctionFactoryTermFunctionTriple', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionTriple instance', () => {
    let actor: ActorFunctionFactoryTermFunctionTriple;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionTriple({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
