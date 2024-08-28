import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIsIri } from '../lib/ActorFunctionFactoryTermFunctionIsIri';

describe('ActorFunctionFactoryTermFunctionIsIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIsIri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIsIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIsIri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
