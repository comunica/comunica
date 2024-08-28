import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDouble } from '../lib/ActorFunctionFactoryTermFunctionXsdToDouble';

describe('ActorFunctionFactoryTermFunctionXsdToDouble', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDouble instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDouble;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDouble({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
