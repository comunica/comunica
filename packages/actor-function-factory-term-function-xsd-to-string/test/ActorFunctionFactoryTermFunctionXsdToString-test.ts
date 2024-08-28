import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToString } from '../lib/ActorFunctionFactoryTermFunctionXsdToString';

describe('ActorFunctionFactoryTermFunctionXsdToString', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToString instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToString;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToString({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
