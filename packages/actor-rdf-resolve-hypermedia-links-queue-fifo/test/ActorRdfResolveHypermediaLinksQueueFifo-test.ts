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

    it('should test', () => {
      return expect(actor.test({ firstUrl: 'A', context: new ActionContext() }))
        .resolves.toEqual(true);
    });

    it('should run', () => {
      return expect(actor.run({ firstUrl: 'A', context: new ActionContext() }))
        .resolves.toEqual({ linkQueue: new LinkQueueFifo() });
    });
  });
});
