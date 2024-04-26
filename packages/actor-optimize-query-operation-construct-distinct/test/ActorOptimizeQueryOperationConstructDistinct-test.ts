import { Bus } from '@comunica/core';
import { ActorOptimizeQueryOperationConstructDistinct } from '../lib/ActorOptimizeQueryOperationConstructDistinct';

describe('ActorOptimizeQueryOperationConstructDistinct', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationConstructDistinct instance', () => {
    let actor: ActorOptimizeQueryOperationConstructDistinct;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationConstructDistinct({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
