import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionIri } from '../lib/ActorFunctionFactoryTermFunctionIri';

describe('ActorFunctionFactoryTermFunctionIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionIri instance', () => {
    let actor: ActorFunctionFactoryTermFunctionIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionIri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
