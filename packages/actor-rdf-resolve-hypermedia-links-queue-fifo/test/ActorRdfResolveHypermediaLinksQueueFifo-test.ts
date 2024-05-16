import { ActionContext, Bus } from '@comunica/core';
import { LinkQueueFifo } from '..';
import { ActorRdfResolveHypermediaLinksQueueFifo } from '../lib/ActorRdfResolveHypermediaLinksQueueFifo';

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
      await expect(actor.test({ firstUrl: 'A', context: new ActionContext() }))
        .resolves.toBe(true);
    });

    it('should run', async() => {
      await expect(actor.run({ firstUrl: 'A', context: new ActionContext() }))
        .resolves.toEqual({ linkQueue: new LinkQueueFifo() });
    });
  });
});
