import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToYearMonthDuration } from '../lib/ActorFunctionFactoryTermFunctionXsdToYearMonthDuration';

describe('ActorFunctionFactoryTermFunctionXsdToYearMonthDuration', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToYearMonthDuration instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToYearMonthDuration;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToYearMonthDuration({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
