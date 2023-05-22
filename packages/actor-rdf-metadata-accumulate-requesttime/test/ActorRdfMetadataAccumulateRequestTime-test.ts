import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataAccumulateRequestTime } from '../lib/ActorRdfMetadataAccumulateRequestTime';

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
        await expect(actor.test({ context, mode: 'initialize' })).resolves.toBeTruthy();
      });
    });

    describe('run', () => {
      it('should handle initialization', async() => {
        expect(await actor.run({ context, mode: 'initialize' }))
          .toEqual({ metadata: {}});
      });

      it('should handle appending with two entries', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { requestTime: 2 },
          appendingMetadata: <any> { requestTime: 3 },
        })).toEqual({ metadata: { requestTime: 5 }});
      });

      it('should handle appending with undefined entries', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> {},
          appendingMetadata: <any> { requestTime: 3 },
        })).toEqual({ metadata: { requestTime: 3 }});
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { requestTime: 2 },
          appendingMetadata: <any> {},
        })).toEqual({ metadata: { requestTime: 2 }});
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> {},
          appendingMetadata: <any> {},
        })).toEqual({ metadata: {}});
      });
    });
  });
});
