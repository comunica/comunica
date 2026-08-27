import { Bus } from '@comunica/core';
import { ActorOptimizeQueryOperationSetSourcesFromDataset } from '../lib/ActorOptimizeQueryOperationSetSourcesFromDataset';
import '@comunica/utils-jest';

describe('ActorOptimizeQueryOperationOptimizeQueryOperationSetSourcesFromDataset', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorOptimizeQueryOperationnSetSourcesFromDataset instance', () => {
    let actor: ActorOptimizeQueryOperationSetSourcesFromDataset;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationSetSourcesFromDataset({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toPassTestVoid(); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});
