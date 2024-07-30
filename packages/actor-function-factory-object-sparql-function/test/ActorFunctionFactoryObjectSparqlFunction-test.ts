import { Bus } from '@comunica/core';
import { ActorFunctionFactoryObjectSparqlFunction } from '../lib/ActorFunctionFactoryObjectSparqlFunction';

describe('ActorFunctionFactoryObjectSparqlFunction', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryObjectSparqlFunction instance', () => {
    let actor: ActorFunctionFactoryObjectSparqlFunction;

    beforeEach(() => {
      actor = new ActorFunctionFactoryObjectSparqlFunction({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
