import { KeysInitQuery } from '@comunica/context-entries';
import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { DataFactory } from 'rdf-data-factory';
import { ActorAggregatedStoreFactoryMemory } from '../lib/ActorAggregatedStoreFactoryMemory';
import { AggregatedStoreMemory } from '../lib/AggregatedStoreMemory';
import '@comunica/utils-jest';

describe('ActorAggregatedStoreFactoryMemory', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext()
      .set(KeysInitQuery.dataFactory, new DataFactory());
  });

  describe('An ActorAggregatedStoreFactoryMemory instance', () => {
    let actor: ActorAggregatedStoreFactoryMemory;

    beforeEach(() => {
      actor = new ActorAggregatedStoreFactoryMemory({
        name: 'actor',
        bus,
        emitPartialCardinalities: false,
        mediatorMetadataAccumulate: <any> {
          mediate: jest.fn(),
        },
      });
    });

    it('should test', async() => {
      await expect(actor.test({ context })).resolves.toPassTestVoid();
    });

    it('should run', async() => {
      const { aggregatedStore } = await actor.run({ context });
      expect(aggregatedStore).toBeInstanceOf(AggregatedStoreMemory);
    });
  });
});
