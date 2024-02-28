import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataAccumulatePageSize } from '../lib/ActorRdfMetadataAccumulatePageSize';

describe('ActorRdfMetadataAccumulatePageSize', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfMetadataAccumulatePageSize instance', () => {
    let actor: ActorRdfMetadataAccumulatePageSize;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulatePageSize({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should always pass', async() => {
        await expect(actor.test({ context, mode: 'initialize' })).resolves.toBeTruthy();
      });
    });

    describe('run', () => {
      it('should handle initialization', async() => {
        await expect(actor.run({ context, mode: 'initialize' })).resolves
          .toEqual({ metadata: {}});
      });

      it('should handle appending with two entries', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { pageSize: 2 },
          appendingMetadata: <any> { pageSize: 3 },
        })).resolves.toEqual({ metadata: { pageSize: 5 }});
      });

      it('should handle appending with undefined entries', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> {},
          appendingMetadata: <any> { pageSize: 3 },
        })).resolves.toEqual({ metadata: { pageSize: 3 }});
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { pageSize: 2 },
          appendingMetadata: <any> {},
        })).resolves.toEqual({ metadata: { pageSize: 2 }});
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> {},
          appendingMetadata: <any> {},
        })).resolves.toEqual({ metadata: {}});
      });
    });
  });
});
