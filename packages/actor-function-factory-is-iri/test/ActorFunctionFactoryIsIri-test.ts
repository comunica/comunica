import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIsIri } from '../lib/ActorFunctionFactoryIsIri';

describe('ActorFunctionFactoryIsIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIsIri instance', () => {
    let actor: ActorFunctionFactoryIsIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIsIri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
