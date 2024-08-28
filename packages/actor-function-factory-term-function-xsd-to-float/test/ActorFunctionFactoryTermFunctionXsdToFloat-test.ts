import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToFloat } from '../lib/ActorFunctionFactoryTermFunctionXsdToFloat';

describe('ActorFunctionFactoryTermFunctionXsdToFloat', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToFloat instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToFloat;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToFloat({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
