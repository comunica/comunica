import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIsTriple } from '../lib/ActorFunctionFactoryIsTriple';

describe('ActorFunctionFactoryIsTriple', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIsTriple instance', () => {
    let actor: ActorFunctionFactoryIsTriple;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIsTriple({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
