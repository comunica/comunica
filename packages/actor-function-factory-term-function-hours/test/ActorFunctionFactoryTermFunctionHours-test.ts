import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionHours } from '../lib/ActorFunctionFactoryTermFunctionHours';

describe('ActorFunctionFactoryTermFunctionHours', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionHours instance', () => {
    let actor: ActorFunctionFactoryTermFunctionHours;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionHours({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
