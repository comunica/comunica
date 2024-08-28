import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToTime } from '../lib/ActorFunctionFactoryTermFunctionXsdToTime';

describe('ActorFunctionFactoryTermFunctionXsdToTime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToTime instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToTime;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToTime({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
