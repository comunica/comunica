import { Bus } from '@comunica/core';
import { ActorFunctionFactoryIri } from '../lib/ActorFunctionFactoryIri';

describe('ActorFunctionFactoryIri', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryIri instance', () => {
    let actor: ActorFunctionFactoryIri;

    beforeEach(() => {
      actor = new ActorFunctionFactoryIri({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
