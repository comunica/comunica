import { ActionContext, Bus } from '@comunica/core';
import { LinkQueueFifo } from '..';
import { ActorRdfResolveHypermediaLinksQueueFifo } from '../lib/ActorRdfResolveHypermediaLinksQueueFifo';
import '@comunica/utils-jest';

describe('ActorRdfResolveHypermediaLinksQueueFifo', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorRdfResolveHypermediaLinksQueueFifo instance', () => {
    let actor: ActorRdfResolveHypermediaLinksQueueFifo;

    beforeEach(() => {
      actor = new ActorRdfResolveHypermediaLinksQueueFifo({ name: 'actor', bus });
    });

    it('should test', async() => {
      await expect(actor.test({ context: new ActionContext() }))
        .resolves.toPassTestVoid();
    });

    it('should run', async() => {
      await expect(actor.run({ context: new ActionContext() }))
        .resolves.toEqual({ linkQueue: new LinkQueueFifo() });
    });
  });
});
