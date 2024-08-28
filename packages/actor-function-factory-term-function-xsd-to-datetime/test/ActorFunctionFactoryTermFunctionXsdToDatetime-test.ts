import { Bus } from '@comunica/core';
import { ActorFunctionFactoryTermFunctionXsdToDatetime } from '../lib/ActorFunctionFactoryTermFunctionXsdToDatetime';

describe('ActorFunctionFactoryTermFunctionXsdToDatetime', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorFunctionFactoryTermFunctionXsdToDatetime instance', () => {
    let actor: ActorFunctionFactoryTermFunctionXsdToDatetime;

    beforeEach(() => {
      actor = new ActorFunctionFactoryTermFunctionXsdToDatetime({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
