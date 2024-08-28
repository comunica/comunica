import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDayTimeDuration } from '../lib/ActorFunctionFactoryTermFunctionXsdToDayTimeDuration';

describe('ActorFunctionFactoryTermFunctionXsdToDayTimeDuration', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDayTimeDuration instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDayTimeDuration;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDayTimeDuration({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
