import { Bus } from '@comunica/core';
import { ActorFunctionFactoryYear } from '../lib/ActorFunctionFactoryYear';

describe('ActorFunctionFactoryYear', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryYear instance', () => {
    let actor: ActorFunctionFactoryYear;

    beforeEach(() => {
      actor = new ActorFunctionFactoryYear({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
