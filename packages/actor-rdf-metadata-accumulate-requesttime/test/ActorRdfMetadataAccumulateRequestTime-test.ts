import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataAccumulateRequestTime } from '../lib/ActorRdfMetadataAccumulateRequestTime';
import '@comunica/utils-jest';

describe('ActorRdfMetadataAccumulateRequestTime', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfMetadataAccumulateRequestTime instance', () => {
    let actor: ActorRdfMetadataAccumulateRequestTime;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateRequestTime({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should always pass', async() => {
        await expect(actor.test({ context, mode: 'initialize' })).resolves.toPassTestVoid();
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
          accumulatedMetadata: <any> { requestTime: 2 },
          appendingMetadata: <any> { requestTime: 3 },
        })).resolves.toEqual({ metadata: { requestTime: 5 }});
      });

      it('should handle appending with undefined entries', async() => {
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> {},
          appendingMetadata: <any> { requestTime: 3 },
        })).resolves.toEqual({ metadata: { requestTime: 3 }});
        await expect(actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { requestTime: 2 },
          appendingMetadata: <any> {},
        })).resolves.toEqual({ metadata: { requestTime: 2 }});
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
