import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTriple } from '../lib/ActorFunctionFactoryTriple';

describe('ActorFunctionFactoryTriple', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTriple instance', () => {
    let actor: ActorFunctionFactoryTriple;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTriple({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
