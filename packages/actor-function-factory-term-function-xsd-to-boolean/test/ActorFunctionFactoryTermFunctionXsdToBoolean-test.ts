import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToBoolean } from '../lib/ActorFunctionFactoryTermFunctionXsdToBoolean';

describe('ActorFunctionFactoryTermFunctionXsdToBoolean', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToBoolean instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToBoolean;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToBoolean({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
