import { ActionContext, Bus } from '@comunica/core';
import type { IActionContext } from '@comunica/types';
import { ActorRdfMetadataAccumulateCanContainUndefs } from '../lib/ActorRdfMetadataAccumulateCanContainUndefs';

describe('ActorRdfMetadataAccumulateCanContainUndefs', () => {
  let bus: any;
  let context: IActionContext;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
    context = new ActionContext();
  });

  describe('An ActorRdfMetadataAccumulateCanContainUndefs instance', () => {
    let actor: ActorRdfMetadataAccumulateCanContainUndefs;

    beforeEach(() => {
      actor = new ActorRdfMetadataAccumulateCanContainUndefs({ name: 'actor', bus });
    });

    describe('test', () => {
      it('should always pass', async() => {
        await expect(actor.test({ context, mode: 'initialize' })).resolves.toBeTruthy();
      });
    });

    describe('run', () => {
      it('should handle initialization', async() => {
        expect(await actor.run({ context, mode: 'initialize' }))
          .toEqual({ metadata: { canContainUndefs: false }});
      });

      it('should handle appending with two false entries', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { canContainUndefs: false },
          appendingMetadata: <any> { canContainUndefs: false },
        })).toEqual({ metadata: { canContainUndefs: false }});
      });

      it('should handle appending with one true entry', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { canContainUndefs: true },
          appendingMetadata: <any> { canContainUndefs: false },
        })).toEqual({ metadata: { canContainUndefs: true }});
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { canContainUndefs: false },
          appendingMetadata: <any> { canContainUndefs: true },
        })).toEqual({ metadata: { canContainUndefs: true }});
      });

      it('should handle appending with two true entries', async() => {
        expect(await actor.run({
          context,
          mode: 'append',
          accumulatedMetadata: <any> { canContainUndefs: true },
          appendingMetadata: <any> { canContainUndefs: true },
        })).toEqual({ metadata: { canContainUndefs: true }});
      });
    });
  });
});
