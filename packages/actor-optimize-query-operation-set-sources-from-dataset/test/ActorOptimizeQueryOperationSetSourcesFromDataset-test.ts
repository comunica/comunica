import type { IActionOptimizeQueryOperation } from '@comunica/bus-optimize-query-operation';
import { Bus } from '@comunica/core';
import { ActorOptimizeQueryOperationSetSourcesFromDataset } from '../lib/index';
import '@comunica/utils-jest';

describe('ActorOptimizeQueryOperationOptimizeQueryOperationSetSourcesFromDataset', () => {
  let bus: any;
  let action: IActionOptimizeQueryOperation;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    action = {
      context: <any> {},
      operation: <any> {},
    };
  });

  describe('An ActorOptimizeQueryOperationnSetSourcesFromDataset instance', () => {
    let actor: ActorOptimizeQueryOperationSetSourcesFromDataset;

    beforeEach(() => {
      actor = new ActorOptimizeQueryOperationSetSourcesFromDataset({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test(action)).resolves.toPassTestVoid();
    });
  });
});
