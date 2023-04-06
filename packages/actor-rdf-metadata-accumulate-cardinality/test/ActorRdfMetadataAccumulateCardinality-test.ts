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
        expect(await actor.run({ context, mode: 'initialize' }))
          .toEqual({ metadata: { cardinality: { type: 'exact', value: 0 }}});
      });

      it('should handle appending with exact cardinalities', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'exact', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'exact', value: 3 }},
        })).toEqual({ metadata: { cardinality: { type: 'exact', value: 5 }}});
      });

      it('should handle appending with estimate cardinalities', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
      });

      it('should handle appending with exact and estimate cardinalities', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'exact', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'exact', value: 3 }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 5 }}});
      });

      it('should handle appending with undefined cardinality', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> {},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
      });

      it('should handle appending with infinite cardinality', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 2 }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: Number.POSITIVE_INFINITY }}});
      });

      it('should handle appending with dataset-wide cardinality', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3 }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }}});
      });

      it('should handle appending with the same dataset-wide cardinality', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'abc' }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }}});
      });

      it('should handle appending with different dataset-wide cardinalities', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'def' }},
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 203 }}});
      });

      it('should handle appending with different dataset-wide cardinalities that are subsets', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { cardinality: { type: 'estimate', value: 200, dataset: 'abc' }},
          appendingMetadata: <any> { cardinality: { type: 'estimate', value: 3, dataset: 'def' }, subsetOf: 'abc' },
        })).toEqual({ metadata: { cardinality: { type: 'estimate', value: 3, dataset: 'def' }}});
      });
    });
  });
});
