import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataAccumulateCardinality } from '../lib/ActorRdfMetadataAccumulateCardinality';

describe('ActorRdfMetadataAccumulateCardinality', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfMetadataAccumulateCardinality instance', () => {
    let actor: ActorRdfMetadataAccumulateCardinality;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateCardinality({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should always pass', async() => {
        await expect(actor.test({ context, mode: 'initialize' })).resolves.toBeTruthy();
      });
    });

    describe('run', () => {
      it('should handle initialization', async() => {
        await expect(actor.run({ context, mode: 'initialize' })).resolves
          .toEqual({ metadata: { cardinality: { type: 'exact', value: 0 }}});
      });

      it('should handle appending with exact cardinalities', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'exact', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'exact', value: 3 }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'exact', value: 5 }}});
      });

      it('should handle appending with estimate cardinalities', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
      });

      it('should handle appending with exact and estimate cardinalities', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'exact', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'exact', value: 3 }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
      });

      it('should handle appending with undefined cardinality', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> {},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
      });

      it('should handle appending with infinite cardinality', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
      });

      it('should handle appending with dataset-wide cardinality', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }}});
      });

      it('should handle appending with the same dataset-wide cardinality', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'abc' }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }}});
      });

      it('should handle appending with different dataset-wide cardinalities', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'def' }},
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 203 }}});
      });

      it('should handle appending with different dataset-wide cardinalities that are subsets', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'def' }, subsetOf: 'abc' },
        })).resolves.toEqual({ metadata: { cardinality: { type: 'estimate', value: 3, dataset: 'def' }}});
      });
    });
  });
});
