import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDate } from '../lib/ActorFunctionFactoryTermFunctionXsdToDate';

describe('ActorFunctionFactoryTermFunctionXsdToDate', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDate instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDate;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDate({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
