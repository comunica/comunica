import { Bus } from '@comunica/core';
import { ActorContextPreprocessStatisticDereferenceOrder } from '../lib/ActorContextPreprocessStatisticDereferenceOrder';

describe('ActorContextPreprocessStatisticDereferenceOrder', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessStatisticDereferenceOrder instance', () => {
    let actor: ActorContextPreprocessStatisticDereferenceOrder;

    beforeEach(() => {
      actor = new ActorContextPreprocessStatisticDereferenceOrder({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
