import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionYear } from '../lib/ActorFunctionFactoryTermFunctionYear';

describe('ActorFunctionFactoryTermFunctionYear', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionYear instance', () => {
    let actor: ActorFunctionFactoryTermFunctionYear;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionYear({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
